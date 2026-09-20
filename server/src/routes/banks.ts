import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../firebase';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const snap = await db.collection('banks').where('is_active', '==', true).get();
    res.json(snap.docs.map((d) => d.data()));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch banks' });
  }
});

const bankSchema = z.object({
  bank_name: z.string().min(1),
  account_number: z.string().min(1),
  account_name: z.string().min(1),
  logo_emoji: z.string().optional().default('🏦'),
  instructions: z.string().optional(),
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = bankSchema.parse(req.body);
    const id = uuidv4();
    const bank = { id, ...data, logo_emoji: data.logo_emoji || '🏦', is_active: true, created_at: new Date().toISOString() };
    await db.collection('banks').doc(id).set(bank);
    res.status(201).json(bank);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid input', details: err.errors }); return; }
    res.status(500).json({ error: 'Failed to create bank' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = bankSchema.partial().parse(req.body);
    const doc = await db.collection('banks').doc(req.params.id).get();
    if (!doc.exists) { res.status(404).json({ error: 'Bank not found' }); return; }
    await db.collection('banks').doc(req.params.id).update(data as any);
    const updated = await db.collection('banks').doc(req.params.id).get();
    res.json(updated.data());
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bank' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await db.collection('banks').doc(req.params.id).update({ is_active: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete bank' });
  }
});

export default router;
