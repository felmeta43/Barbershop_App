import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../firebase';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const snap = await db.collection('barbers')
      .where('is_active', '==', true)
      .orderBy('name')
      .get();
    res.json(snap.docs.map((d) => d.data()));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch barbers' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await db.collection('barbers').doc(req.params.id).get();
    if (!doc.exists) { res.status(404).json({ error: 'Barber not found' }); return; }
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch barber' });
  }
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

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = barberSchema.parse(req.body);
    const id = uuidv4();
    const barber = {
      id, ...data,
      name_am: data.name_am ?? null, name_om: data.name_om ?? null,
      phone: data.phone ?? null, specialty: data.specialty ?? null,
      specialty_am: data.specialty_am ?? null, specialty_om: data.specialty_om ?? null,
      avatar: data.avatar ?? null,
      is_active: true, created_at: new Date().toISOString(),
    };
    await db.collection('barbers').doc(id).set(barber);
    res.status(201).json(barber);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid input', details: err.errors }); return; }
    res.status(500).json({ error: 'Failed to create barber' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = barberSchema.partial().parse(req.body);
    const doc = await db.collection('barbers').doc(req.params.id).get();
    if (!doc.exists) { res.status(404).json({ error: 'Barber not found' }); return; }
    await db.collection('barbers').doc(req.params.id).update(data as any);
    const updated = await db.collection('barbers').doc(req.params.id).get();
    res.json(updated.data());
  } catch (err) {
    res.status(500).json({ error: 'Failed to update barber' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await db.collection('barbers').doc(req.params.id).update({ is_active: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete barber' });
  }
});

export default router;
