import { Router, Request, Response } from 'express';
import { db } from '../firebase';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendQueueCallNotification } from '../services/smsService';

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const router = Router();

router.get('/today', async (_req: Request, res: Response) => {
  try {
    const today = localToday();
    const snap = await db.collection('queue')
      .where('appointment_date', '==', today)
      .get();
    const queue = snap.docs.map((d) => d.data()).sort((a, b) => a.queue_position - b.queue_position);
    res.json(queue);
  } catch (err) {
    console.error('Queue today error:', err);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const today = localToday();
    const snap = await db.collection('queue')
      .where('appointment_date', '==', today)
      .get();

    const docs = snap.docs.map((d) => d.data() as any);
    const stats = {
      total: docs.length,
      waiting: docs.filter((d: any) => d.status === 'waiting').length,
      called: docs.filter((d: any) => d.status === 'called').length,
      served: docs.filter((d: any) => d.status === 'served').length,
      cancelled: docs.filter((d: any) => d.appointment_status === 'cancelled').length,
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.patch('/:id/call', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const doc = await db.collection('queue').doc(req.params.id).get();
    if (!doc.exists) { res.status(404).json({ error: 'Queue entry not found' }); return; }
    const entry = doc.data() as any;

    const batch = db.batch();
    batch.update(doc.ref, { status: 'called', called_at: new Date().toISOString() });
    batch.update(db.collection('appointments').doc(entry.appointment_id), { status: 'in-progress' });
    await batch.commit();

    // Get queue_number from appointment for SMS
    const apptDoc = await db.collection('appointments').doc(entry.appointment_id).get();
    const appt = apptDoc.data() as any;

    sendQueueCallNotification({
      phone: entry.customer_phone,
      customerName: entry.customer_name,
      queueNumber: appt?.queue_number || entry.queue_position,
      barberName: entry.barber_name || 'Your barber',
      appointmentId: entry.appointment_id,
    }).catch(console.error);

    res.json({ success: true, message: 'Customer called and SMS sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to call customer' });
  }
});

router.patch('/:id/serve', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const doc = await db.collection('queue').doc(req.params.id).get();
    if (!doc.exists) { res.status(404).json({ error: 'Queue entry not found' }); return; }
    const entry = doc.data() as any;

    const batch = db.batch();
    batch.update(doc.ref, { status: 'served', served_at: new Date().toISOString(), appointment_status: 'completed' });
    batch.update(db.collection('appointments').doc(entry.appointment_id), { status: 'completed' });
    await batch.commit();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to serve customer' });
  }
});

router.patch('/:id/skip', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const doc = await db.collection('queue').doc(req.params.id).get();
    if (!doc.exists) { res.status(404).json({ error: 'Queue entry not found' }); return; }
    const entry = doc.data() as any;

    const batch = db.batch();
    batch.update(doc.ref, { status: 'skipped', appointment_status: 'no-show' });
    batch.update(db.collection('appointments').doc(entry.appointment_id), { status: 'no-show' });
    await batch.commit();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to skip customer' });
  }
});

export default router;
