import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const barbers = db.prepare('SELECT * FROM barbers WHERE is_active = 1 ORDER BY name').all();
  res.json(barbers);
});

router.get('/:id', (req: Request, res: Response) => {
  const barber = db.prepare('SELECT * FROM barbers WHERE id = ?').get(req.params.id);
  if (!barber) {
    res.status(404).json({ error: 'Barber not found' });
    return;
  }
  res.json(barber);
});

const barberSchema = z.object({
  name: z.string().min(1),
  name_am: z.string().optional(),
  name_om: z.string().optional(),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  specialty_am: z.string().optional(),
  specialty_om: z.string().optional(),
  avatar: z.string().optional(),
});

router.post('/', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const data = barberSchema.parse(req.body);
    const id = uuidv4();
    db.prepare(`
      INSERT INTO barbers (id, name, name_am, name_om, phone, specialty, specialty_am, specialty_om, avatar)
      VALUES (@id, @name, @name_am, @name_om, @phone, @specialty, @specialty_am, @specialty_om, @avatar)
    `).run({ id, name_am: null, name_om: null, phone: null, specialty: null, specialty_am: null, specialty_om: null, avatar: null, ...data });
    const barber = db.prepare('SELECT * FROM barbers WHERE id = ?').get(id);
    res.status(201).json(barber);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create barber' });
  }
});

router.put('/:id', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const data = barberSchema.partial().parse(req.body);
    const existing = db.prepare('SELECT * FROM barbers WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Barber not found' });
      return;
    }
    const updated = { ...existing, ...data };
    db.prepare(`
      UPDATE barbers SET name=@name, name_am=@name_am, name_om=@name_om,
      phone=@phone, specialty=@specialty, specialty_am=@specialty_am,
      specialty_om=@specialty_om, avatar=@avatar WHERE id=@id
    `).run({ ...updated, id: req.params.id });
    res.json(db.prepare('SELECT * FROM barbers WHERE id = ?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update barber' });
  }
});

router.delete('/:id', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  db.prepare('UPDATE barbers SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
