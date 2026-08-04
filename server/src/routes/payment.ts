import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../database';
import { initializeChapaPayment, verifyChapaPayment } from '../services/paymentService';

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('2519') || digits.startsWith('2517')) return `+${digits}`;
  if (digits.startsWith('09') || digits.startsWith('07')) return `+251${digits.slice(1)}`;
  if (digits.startsWith('9') || digits.startsWith('7')) return `+251${digits}`;
  if (digits.startsWith('251')) return `+${digits}`;
  return phone;
}

const router = Router();

const initSchema = z.object({
  appointment_id: z.string().uuid(),
  email: z.string().email().optional().or(z.literal('')),
});

router.post('/initialize', async (req: Request, res: Response) => {
  try {
    const { appointment_id, email } = initSchema.parse(req.body);

    // Detect the actual host the user is accessing from (works for IP:port, localhost, domain)
    const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const baseUrl = process.env.CLIENT_URL || `${protocol}://${host}`;

    const appointment = db.prepare(`
      SELECT a.*, s.name as service_name, s.price as service_price
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.id = ?
    `).get(appointment_id) as any;

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    if (appointment.payment_status === 'paid') {
      res.status(400).json({ error: 'Already paid' });
      return;
    }

    const txRef = `BARBER-${uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
    const nameParts = appointment.customer_name.split(' ');
    const firstName = nameParts[0] || appointment.customer_name;
    const lastName = nameParts.slice(1).join(' ') || '-';

    const chapaRes = await initializeChapaPayment({
      amount: appointment.service_price || appointment.payment_amount,
      currency: 'ETB',
      email: email || appointment.customer_email || 'noreply@barbershop.et',
      firstName,
      lastName,
      phone: normalizePhone(appointment.customer_phone),
      txRef,
      returnUrl: `${baseUrl}/payment/callback?tx_ref=${txRef}&appointment_id=${appointment_id}`,
      callbackUrl: `${process.env.SERVER_URL || baseUrl}/api/payment/webhook`,
      description: `Barbershop - ${appointment.service_name}`,
    });

    db.prepare('UPDATE appointments SET payment_tx_ref = ? WHERE id = ?').run(txRef, appointment_id);

    res.json({
      checkout_url: chapaRes.data.checkout_url,
      tx_ref: txRef,
    });
  } catch (err: any) {
    console.error('Payment init error:', err);
    res.status(500).json({ error: err.message || 'Payment initialization failed' });
  }
});

router.get('/verify/:txRef', async (req: Request, res: Response) => {
  try {
    const { txRef } = req.params;
    const result = await verifyChapaPayment(txRef);

    if (result.data.status === 'success') {
      db.prepare(
        "UPDATE appointments SET payment_status = 'paid', payment_tx_ref = ? WHERE payment_tx_ref = ?"
      ).run(txRef, txRef);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Verification failed' });
  }
});

router.post('/webhook', (req: Request, res: Response) => {
  const { trx_ref, status } = req.body;
  if (trx_ref && status === 'success') {
    db.prepare(
      "UPDATE appointments SET payment_status = 'paid' WHERE payment_tx_ref = ?"
    ).run(trx_ref);
  }
  res.json({ received: true });
});

export default router;
