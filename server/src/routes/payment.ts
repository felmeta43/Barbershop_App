import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../firebase';
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
  email: z.preprocess(v => (v == null ? undefined : v), z.string().email().optional().or(z.literal(''))),
});

router.post('/initialize', async (req: Request, res: Response) => {
  try {
    const { appointment_id, email } = initSchema.parse(req.body);

    const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const baseUrl = process.env.CLIENT_URL || `${protocol}://${host}`;

    const apptDoc = await db.collection('appointments').doc(appointment_id).get();
    if (!apptDoc.exists) { res.status(404).json({ error: 'Appointment not found' }); return; }
    const appointment = apptDoc.data() as any;

    if (appointment.payment_status === 'paid') { res.status(400).json({ error: 'Already paid' }); return; }

    const txRef = `BARBER-${uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
    const nameParts = appointment.customer_name.split(' ');
    const firstName = nameParts[0] || appointment.customer_name;
    const lastName = nameParts.slice(1).join(' ') || '-';

    const chapaRes = await initializeChapaPayment({
      amount: appointment.service_price || appointment.payment_amount,
      currency: 'ETB',
      email: email || appointment.customer_email || 'noreply@barbershop.com',
      firstName,
      lastName,
      phone: normalizePhone(appointment.customer_phone),
      txRef,
      returnUrl: `${baseUrl}/payment/callback?tx_ref=${txRef}&appointment_id=${appointment_id}`,
      callbackUrl: `${process.env.SERVER_URL || baseUrl}/api/payment/webhook`,
      description: `Barbershop - ${appointment.service_name}`,
    });

    await db.collection('appointments').doc(appointment_id).update({ payment_tx_ref: txRef });

    res.json({ checkout_url: chapaRes.data.checkout_url, tx_ref: txRef });
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
      const snap = await db.collection('appointments').where('payment_tx_ref', '==', txRef).limit(1).get();
      if (!snap.empty) {
        await snap.docs[0].ref.update({ payment_status: 'paid' });
      }
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Verification failed' });
  }
});

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { trx_ref, status } = req.body;
    if (trx_ref && status === 'success') {
      const snap = await db.collection('appointments').where('payment_tx_ref', '==', trx_ref).limit(1).get();
      if (!snap.empty) await snap.docs[0].ref.update({ payment_status: 'paid' });
    }
    res.json({ received: true });
  } catch {
    res.json({ received: true });
  }
});

export default router;
