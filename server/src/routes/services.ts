import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../firebase';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const snap = await db.collection('services')
      .where('is_active', '==', true)
      .get();
    const services = snap.docs.map((d) => d.data())
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    res.json(services);
  } catch (err) {
    console.error('Services fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
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
  category: z.enum(['haircut', 'beard', 'combo', 'kids', 'styling', 'treatment', 'other']).default('haircut'),
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = serviceSchema.parse(req.body);
    const id = uuidv4();
    const service = {
      id, ...data,
      name_am: data.name_am ?? null, name_om: data.name_om ?? null,
      description: data.description ?? null, description_am: data.description_am ?? null,
      description_om: data.description_om ?? null,
      is_active: true, created_at: new Date().toISOString(),
    };
    await db.collection('services').doc(id).set(service);
    res.status(201).json(service);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid input', details: err.errors }); return; }
    res.status(500).json({ error: 'Failed to create service' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = serviceSchema.partial().parse(req.body);
    const doc = await db.collection('services').doc(req.params.id).get();
    if (!doc.exists) { res.status(404).json({ error: 'Service not found' }); return; }
    await db.collection('services').doc(req.params.id).update(data as any);
    const updated = await db.collection('services').doc(req.params.id).get();
    res.json(updated.data());
  } catch (err) {
    res.status(500).json({ error: 'Failed to update service' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await db.collection('services').doc(req.params.id).update({ is_active: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

export default router;
