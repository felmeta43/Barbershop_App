import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../firebase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

function generateCode(): string {
  // Unambiguous characters: no 0/O, 1/I/L
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// POST /api/device/verify — public, called on first app launch
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { code, device_id } = req.body;
    if (!code || !device_id) {
      res.status(400).json({ error: 'code and device_id are required' });
      return;
    }

    // Check if device is already verified
    const existing = await db.collection('device_verifications').doc(device_id).get();
    if (existing.exists) {
      res.json({ success: true, already_verified: true });
      return;
    }

    // Find the code (case-insensitive)
    const snap = await db.collection('device_codes')
      .where('code', '==', code.toUpperCase().trim())
      .where('is_active', '==', true)
      .limit(1)
      .get();

    if (snap.empty) {
      res.status(403).json({ error: 'Invalid or expired code' });
      return;
    }

    const codeDoc = snap.docs[0];
    const codeData = codeDoc.data() as any;

    // Check max_uses (0 = unlimited)
    if (codeData.max_uses > 0 && codeData.use_count >= codeData.max_uses) {
      res.status(403).json({ error: 'This code has reached its maximum uses' });
      return;
    }

    // Record verification and increment use count
    const batch = db.batch();
    batch.set(db.collection('device_verifications').doc(device_id), {
      device_id,
      code: codeData.code,
      code_id: codeDoc.id,
      verified_at: new Date().toISOString(),
    });
    batch.update(codeDoc.ref, { use_count: (codeData.use_count || 0) + 1 });
    await batch.commit();

    res.json({ success: true });
  } catch (err) {
    console.error('Device verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// GET /api/device/codes — admin only, list all device codes
router.get('/codes', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const snap = await db.collection('device_codes').orderBy('created_at', 'desc').get();
    const codes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(codes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch codes' });
  }
});

// POST /api/device/codes — admin only, generate a new code
router.post('/codes', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { label, max_uses = 1 } = req.body;

    // Generate unique code
    let code = generateCode();
    let attempt = 0;
    while (attempt < 5) {
      const existing = await db.collection('device_codes').where('code', '==', code).limit(1).get();
      if (existing.empty) break;
      code = generateCode();
      attempt++;
    }

    const id = uuidv4();
    const doc = {
      id,
      code,
      label: label || '',
      max_uses: Number(max_uses),
      use_count: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      created_by: (req as any).user?.username || 'admin',
    };
    await db.collection('device_codes').doc(id).set(doc);
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate code' });
  }
});

// PATCH /api/device/codes/:id — admin only, toggle active or update label
router.patch('/codes/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { is_active, label, max_uses } = req.body;
    const updates: any = {};
    if (is_active !== undefined) updates.is_active = is_active;
    if (label !== undefined) updates.label = label;
    if (max_uses !== undefined) updates.max_uses = Number(max_uses);
    await db.collection('device_codes').doc(req.params.id).update(updates);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update code' });
  }
});

// DELETE /api/device/codes/:id — admin only
router.delete('/codes/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await db.collection('device_codes').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete code' });
  }
});

// GET /api/device/verifications — admin only, list verified devices
router.get('/verifications', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const snap = await db.collection('device_verifications').orderBy('verified_at', 'desc').get();
    res.json(snap.docs.map((d) => d.data()));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch verifications' });
  }
});

// DELETE /api/device/verifications/:device_id — admin only, revoke a device
router.delete('/verifications/:device_id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await db.collection('device_verifications').doc(req.params.device_id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke device' });
  }
});

export default router;
