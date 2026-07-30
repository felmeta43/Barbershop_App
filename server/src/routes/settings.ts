import { Router, Response } from 'express';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', (_req, res: Response) => {
  const row = db.prepare('SELECT data FROM shop_settings WHERE id = ?').get('main') as any;
  res.json(row ? JSON.parse(row.data) : {});
});

router.put('/', authenticate, (req: AuthRequest, res: Response) => {
  const row = db.prepare('SELECT data FROM shop_settings WHERE id = ?').get('main') as any;
  const current = row ? JSON.parse(row.data) : {};
  const updated = { ...current, ...req.body };
  db.prepare(
    'INSERT OR REPLACE INTO shop_settings (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
  ).run('main', JSON.stringify(updated));
  res.json(updated);
});

export default router;
