import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const services = db.prepare('SELECT * FROM services WHERE is_active = 1 ORDER BY category, price').all();
  res.json(services);
});

const serviceSchema = z.object({
  name: z.string().min(1),
  name_am: z.string().optional(),
  name_om: z.string().optional(),
  description: z.string().optional(),
  description_am: z.string().optional(),
  description_om: z.string().optional(),
  price: z.number().positive(),
  duration_minutes: z.number().int().positive(),
  category: z.enum(['haircut', 'beard', 'combo', 'kids', 'styling', 'other']).default('haircut'),
});

router.post('/', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const data = serviceSchema.parse(req.body);
    const id = uuidv4();
    db.prepare(`
      INSERT INTO services (id, name, name_am, name_om, description, description_am, description_om, price, duration_minutes, category)
      VALUES (@id, @name, @name_am, @name_om, @description, @description_am, @description_om, @price, @duration_minutes, @category)
    `).run({ id, name_am: null, name_om: null, description: null, description_am: null, description_om: null, ...data });
    res.status(201).json(db.prepare('SELECT * FROM services WHERE id = ?').get(id));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create service' });
  }
});

router.put('/:id', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const data = serviceSchema.partial().parse(req.body);
    const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }
    const updated = { ...existing, ...data };
    db.prepare(`
      UPDATE services SET name=@name, name_am=@name_am, name_om=@name_om,
      description=@description, description_am=@description_am, description_om=@description_om,
      price=@price, duration_minutes=@duration_minutes, category=@category WHERE id=@id
    `).run({ ...updated, id: req.params.id });
    res.json(db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update service' });
  }
});

router.delete('/:id', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  db.prepare('UPDATE services SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
