import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendBookingConfirmation } from '../services/smsService';

const router = Router();

// Rate limit only new bookings (POST), not reads/availability checks
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

    const service = db.prepare('SELECT * FROM services WHERE id = ? AND is_active = 1').get(data.service_id) as any;
    if (!service) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }

    const barber = data.barber_id
      ? (db.prepare('SELECT * FROM barbers WHERE id = ? AND is_active = 1').get(data.barber_id) as any)
      : null;

    // Get next queue number for today
    const queueCount = db.prepare(
      "SELECT COUNT(*) as cnt FROM appointments WHERE appointment_date = ? AND status != 'cancelled'"
    ).get(data.appointment_date) as { cnt: number };
    const queueNumber = (queueCount.cnt || 0) + 1;

    const id = uuidv4();
    db.prepare(`
      INSERT INTO appointments (id, customer_name, customer_phone, customer_email, barber_id, service_id,
        appointment_date, appointment_time, queue_number, payment_amount, notes)
      VALUES (@id, @customer_name, @customer_phone, @customer_email, @barber_id, @service_id,
        @appointment_date, @appointment_time, @queue_number, @payment_amount, @notes)
    `).run({
      id,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_email: data.customer_email || null,
      barber_id: data.barber_id || null,
      service_id: data.service_id,
      appointment_date: data.appointment_date,
      appointment_time: data.appointment_time,
      queue_number: queueNumber,
      payment_amount: service.price,
      notes: data.notes || null,
    });

    // Add to queue
    const queueId = uuidv4();
    db.prepare(`
      INSERT INTO queue (id, appointment_id, queue_position, status)
      VALUES (?, ?, ?, 'waiting')
    `).run(queueId, id, queueNumber);

    const appointment = db.prepare(`
      SELECT a.*, s.name as service_name, s.name_am as service_name_am, s.name_om as service_name_om,
             b.name as barber_name, b.name_am as barber_name_am, b.name_om as barber_name_om
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN barbers b ON a.barber_id = b.id
      WHERE a.id = ?
    `).get(id) as any;

    // Send SMS confirmation (non-blocking)
    const langMap: Record<string, string> = { am: 'am', om: 'om', en: 'en' };
    sendBookingConfirmation({
      phone: data.customer_phone,
      customerName: data.customer_name,
      serviceName: appointment.service_name,
      barberName: appointment.barber_name || 'Any Barber',
      date: data.appointment_date,
      time: data.appointment_time,
      queueNumber,
      appointmentId: id,
      lang: langMap[data.lang],
    }).catch(console.error);

    res.status(201).json({ ...appointment, queue_number: queueNumber });
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

router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { date, status } = req.query;
  let query = `
    SELECT a.*, s.name as service_name, s.price as service_price,
           b.name as barber_name
    FROM appointments a
    LEFT JOIN services s ON a.service_id = s.id
    LEFT JOIN barbers b ON a.barber_id = b.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (date) { query += ' AND a.appointment_date = ?'; params.push(date); }
  if (status) { query += ' AND a.status = ?'; params.push(status); }

  query += ' ORDER BY a.appointment_date, a.appointment_time';

  const appointments = db.prepare(query).all(...params);
  res.json(appointments);
});

router.get('/:id', (req: Request, res: Response) => {
  const appointment = db.prepare(`
    SELECT a.*, s.name as service_name, s.name_am as service_name_am,
           s.name_om as service_name_om, s.price as service_price,
           b.name as barber_name, b.name_am as barber_name_am, b.name_om as barber_name_om
    FROM appointments a
    LEFT JOIN services s ON a.service_id = s.id
    LEFT JOIN barbers b ON a.barber_id = b.id
    WHERE a.id = ?
  `).get(req.params.id);

  if (!appointment) {
    res.status(404).json({ error: 'Appointment not found' });
    return;
  }
  res.json(appointment);
});

router.patch('/:id/status', authenticate, (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }
  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

router.get('/check/availability', (req: Request, res: Response) => {
  const { date, barber_id } = req.query;
  if (!date) {
    res.status(400).json({ error: 'Date required' });
    return;
  }
  let query = "SELECT appointment_time FROM appointments WHERE appointment_date = ? AND status != 'cancelled'";
  const params: any[] = [date];
  if (barber_id) { query += ' AND barber_id = ?'; params.push(barber_id); }

  const booked = db.prepare(query).all(...params).map((r: any) => r.appointment_time);
  res.json({ booked_times: booked });
});

export default router;
