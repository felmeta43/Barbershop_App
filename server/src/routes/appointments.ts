import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import type { Query, DocumentData } from 'firebase-admin/firestore';
import type { SendResponse } from 'firebase-admin/messaging';
import { db, messaging } from '../firebase';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendBookingConfirmation } from '../services/smsService';

const router = Router();

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { error: 'Too many bookings from this device. Please wait an hour and try again.' },
});

const appointmentSchema = z.object({
  customer_name: z.string().min(1),
  customer_phone: z.string().min(9),
  customer_email: z.string().email().optional().or(z.literal('')),
  barber_id: z.preprocess(v => (v === '' ? undefined : v), z.string().uuid().optional()),
  service_id: z.string().uuid(),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  appointment_time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().optional(),
  lang: z.enum(['en', 'am', 'om']).default('en'),
});

router.post('/', bookingLimiter, async (req: Request, res: Response) => {
  try {
    const data = appointmentSchema.parse(req.body);

    // Fetch service
    const serviceDoc = await db.collection('services').doc(data.service_id).get();
    if (!serviceDoc.exists || !(serviceDoc.data() as any).is_active) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }
    const service = serviceDoc.data() as any;

    // Fetch barber if specified
    let barber: any = null;
    if (data.barber_id) {
      const barberDoc = await db.collection('barbers').doc(data.barber_id).get();
      if (barberDoc.exists) barber = barberDoc.data();
    }

    // Count existing appointments for queue number
    const countSnap = await db.collection('appointments')
      .where('appointment_date', '==', data.appointment_date)
      .where('status', '!=', 'cancelled')
      .get();
    const queueNumber = countSnap.size + 1;

    const id = uuidv4();
    const appointment: any = {
      id,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_email: data.customer_email || null,
      barber_id: data.barber_id || null,
      barber_name: barber?.name || null,
      barber_name_am: barber?.name_am || null,
      barber_name_om: barber?.name_om || null,
      service_id: data.service_id,
      service_name: service.name,
      service_name_am: service.name_am || null,
      service_name_om: service.name_om || null,
      service_price: service.price,
      appointment_date: data.appointment_date,
      appointment_time: data.appointment_time,
      status: 'pending',
      queue_number: queueNumber,
      payment_status: 'unpaid',
      payment_tx_ref: null,
      payment_amount: service.price,
      notes: data.notes || null,
      created_at: new Date().toISOString(),
    };

    // Add appointment
    await db.collection('appointments').doc(id).set(appointment);

    // Add to queue (denormalized)
    const queueId = uuidv4();
    await db.collection('queue').doc(queueId).set({
      id: queueId,
      appointment_id: id,
      appointment_date: data.appointment_date,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      appointment_time: data.appointment_time,
      appointment_status: 'pending',
      payment_status: 'unpaid',
      service_name: service.name,
      duration_minutes: service.duration_minutes,
      barber_name: barber?.name || null,
      queue_position: queueNumber,
      status: 'waiting',
      called_at: null,
      served_at: null,
      created_at: new Date().toISOString(),
    });

    // Send FCM push notification to admin
    sendAdminPushNotification(data.customer_name, service.name, data.appointment_date, data.appointment_time)
      .catch(err => console.error('FCM error:', err));

    // Send SMS confirmation
    const langMap: Record<string, string> = { am: 'am', om: 'om', en: 'en' };
    const sms_sent = await sendBookingConfirmation({
      phone: data.customer_phone,
      customerName: data.customer_name,
      serviceName: service.name,
      barberName: barber?.name || 'Any Barber',
      date: data.appointment_date,
      time: data.appointment_time,
      queueNumber,
      appointmentId: id,
      lang: langMap[data.lang],
    }).catch((err) => { console.error('SMS error:', err); return false; });

    res.status(201).json({ ...appointment, queue_number: queueNumber, sms_sent });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const msg = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      console.error('Booking validation error:', msg);
      res.status(400).json({ error: `Validation failed: ${msg}` });
      return;
    }
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Failed to create appointment', detail: String(err) });
  }
});

async function sendAdminPushNotification(customerName: string, serviceName: string, date: string, time: string) {
  const tokensSnap = await db.collection('fcm_tokens').get();
  if (tokensSnap.empty) return;
  const tokens = tokensSnap.docs.map((d) => (d.data() as { token: string }).token).filter(Boolean);
  if (!tokens.length) return;

  const message = {
    notification: {
      title: 'New Appointment Booked',
      body: `${customerName} booked ${serviceName} on ${date} at ${time}`,
    },
    tokens,
  };
  const result = await messaging.sendEachForMulticast(message);
  console.log(`FCM: ${result.successCount} sent, ${result.failureCount} failed`);

  // Remove invalid tokens
  const invalidTokenDocs: string[] = [];
  result.responses.forEach((r: SendResponse, idx: number) => {
    if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
      invalidTokenDocs.push(tokens[idx]);
    }
  });
  if (invalidTokenDocs.length) {
    const batch = db.batch();
    for (const token of invalidTokenDocs) {
      const snap = await db.collection('fcm_tokens').where('token', '==', token).get();
      snap.docs.forEach((d) => batch.delete(d.ref));
    }
    await batch.commit();
  }
}

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { date, status } = req.query;
    let query: Query<DocumentData> = db.collection('appointments');

    if (date) query = query.where('appointment_date', '==', date as string);
    if (status) query = query.where('status', '==', status as string);

    query = query.orderBy('appointment_date').orderBy('appointment_time');

    const snap = await query.get();
    res.json(snap.docs.map((d) => d.data()));
  } catch (err) {
    console.error('Appointments fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

router.get('/check/availability', async (req: Request, res: Response) => {
  try {
    const { date, barber_id } = req.query;
    if (!date) { res.status(400).json({ error: 'Date required' }); return; }

    let query: Query<DocumentData> = db.collection('appointments')
      .where('appointment_date', '==', date as string)
      .where('status', '!=', 'cancelled');

    if (barber_id) query = query.where('barber_id', '==', barber_id as string);

    const snap = await query.get();
    const booked_times = snap.docs.map((d) => (d.data() as any).appointment_time);
    res.json({ booked_times });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await db.collection('appointments').doc(req.params.id).get();
    if (!doc.exists) { res.status(404).json({ error: 'Appointment not found' }); return; }
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(status)) { res.status(400).json({ error: 'Invalid status' }); return; }

    await db.collection('appointments').doc(req.params.id).update({ status });
    // Sync to queue doc
    const qSnap = await db.collection('queue').where('appointment_id', '==', req.params.id).limit(1).get();
    if (!qSnap.empty) await qSnap.docs[0].ref.update({ appointment_status: status });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.patch('/:id/payment', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { payment_status, payment_amount } = req.body;
    const doc = await db.collection('appointments').doc(req.params.id).get();
    if (!doc.exists) { res.status(404).json({ error: 'Not found' }); return; }

    const validStatuses = ['paid', 'unpaid'];
    if (payment_status && !validStatuses.includes(payment_status)) {
      res.status(400).json({ error: 'Invalid payment status' }); return;
    }

    const updates: any = {};
    if (payment_status !== undefined) updates.payment_status = payment_status;
    if (payment_amount !== undefined) updates.payment_amount = Number(payment_amount);
    await db.collection('appointments').doc(req.params.id).update(updates);

    // Sync payment_status to queue doc
    if (payment_status !== undefined) {
      const qSnap = await db.collection('queue').where('appointment_id', '==', req.params.id).limit(1).get();
      if (!qSnap.empty) await qSnap.docs[0].ref.update({ payment_status });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

export default router;
