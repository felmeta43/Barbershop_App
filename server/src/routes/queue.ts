import { Router, Request, Response } from 'express';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendQueueCallNotification } from '../services/smsService';

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const router = Router();

router.get('/today', (_req: Request, res: Response) => {
  const today = localToday();
  const queue = db.prepare(`
    SELECT q.*, a.customer_name, a.customer_phone, a.appointment_time,
           a.status as appointment_status, a.payment_status,
           s.name as service_name, s.duration_minutes,
           b.name as barber_name
    FROM queue q
    JOIN appointments a ON q.appointment_id = a.id
    LEFT JOIN services s ON a.service_id = s.id
    LEFT JOIN barbers b ON a.barber_id = b.id
    WHERE a.appointment_date = ?
    ORDER BY q.queue_position ASC
  `).all(today);
  res.json(queue);
});

router.get('/stats', (_req: Request, res: Response) => {
  const today = localToday();
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN q.status = 'waiting' THEN 1 ELSE 0 END) as waiting,
      SUM(CASE WHEN q.status = 'called' THEN 1 ELSE 0 END) as called,
      SUM(CASE WHEN q.status = 'served' THEN 1 ELSE 0 END) as served,
      SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
    FROM queue q
    JOIN appointments a ON q.appointment_id = a.id
    WHERE a.appointment_date = ?
  `).get(today);
  res.json(stats);
});

router.patch('/:id/call', authenticate, async (req: AuthRequest, res: Response) => {
  const entry = db.prepare(`
    SELECT q.*, a.customer_name, a.customer_phone, a.queue_number,
           b.name as barber_name
    FROM queue q
    JOIN appointments a ON q.appointment_id = a.id
    LEFT JOIN barbers b ON a.barber_id = b.id
    WHERE q.id = ?
  `).get(req.params.id) as any;

  if (!entry) {
    res.status(404).json({ error: 'Queue entry not found' });
    return;
  }

  db.prepare("UPDATE queue SET status = 'called', called_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  db.prepare("UPDATE appointments SET status = 'in-progress' WHERE id = ?").run(entry.appointment_id);

  sendQueueCallNotification({
    phone: entry.customer_phone,
    customerName: entry.customer_name,
    queueNumber: entry.queue_number,
    barberName: entry.barber_name || 'Your barber',
    appointmentId: entry.appointment_id,
  }).catch(console.error);

  res.json({ success: true, message: 'Customer called and SMS sent' });
});

router.patch('/:id/serve', authenticate, (req: AuthRequest, res: Response) => {
  const entry = db.prepare('SELECT * FROM queue WHERE id = ?').get(req.params.id) as any;
  if (!entry) {
    res.status(404).json({ error: 'Queue entry not found' });
    return;
  }
  db.prepare("UPDATE queue SET status = 'served', served_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  db.prepare("UPDATE appointments SET status = 'completed' WHERE id = ?").run(entry.appointment_id);
  res.json({ success: true });
});

router.patch('/:id/skip', authenticate, (req: AuthRequest, res: Response) => {
  const entry = db.prepare('SELECT * FROM queue WHERE id = ?').get(req.params.id) as any;
  if (!entry) {
    res.status(404).json({ error: 'Queue entry not found' });
    return;
  }
  db.prepare("UPDATE queue SET status = 'skipped' WHERE id = ?").run(req.params.id);
  db.prepare("UPDATE appointments SET status = 'no-show' WHERE id = ?").run(entry.appointment_id);
  res.json({ success: true });
});

export default router;
