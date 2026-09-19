import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../firebase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Register or update FCM token for admin push notifications
router.post('/token', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'FCM token required' });
      return;
    }

    // Check if token already exists
    const existing = await db.collection('fcm_tokens').where('token', '==', token).limit(1).get();
    if (existing.empty) {
      const id = uuidv4();
      await db.collection('fcm_tokens').doc(id).set({
        id, token,
        admin_id: (req as any).user?.id || null,
        created_at: new Date().toISOString(),
      });
    } else {
      // Touch timestamp so we know token is still active
      await existing.docs[0].ref.update({ updated_at: new Date().toISOString() });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('FCM token save error:', err);
    res.status(500).json({ error: 'Failed to save token' });
  }
});

// Remove FCM token on logout
router.delete('/token', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) { res.status(400).json({ error: 'FCM token required' }); return; }
    const snap = await db.collection('fcm_tokens').where('token', '==', token).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove token' });
  }
});

export default router;
