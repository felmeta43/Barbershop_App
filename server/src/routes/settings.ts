import { Router, Response } from 'express';
import { db } from '../firebase';
import { authenticate, AuthRequest } from '../middleware/auth';
import { DEFAULT_SETTINGS } from '../database';

const router = Router();

router.get('/', async (_req, res: Response) => {
  try {
    const doc = await db.collection('shop_settings').doc('main').get();
    res.json(doc.exists ? doc.data() : DEFAULT_SETTINGS);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const doc = await db.collection('shop_settings').doc('main').get();
    const current = doc.exists ? doc.data()! : DEFAULT_SETTINGS;
    const updated = { ...current, ...req.body, updated_at: new Date().toISOString() };
    await db.collection('shop_settings').doc('main').set(updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
