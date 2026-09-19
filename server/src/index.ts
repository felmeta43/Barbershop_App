import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { autoSeed } from './database';
import authRoutes from './routes/auth';
import barberRoutes from './routes/barbers';
import serviceRoutes from './routes/services';
import appointmentRoutes from './routes/appointments';
import queueRoutes from './routes/queue';
import paymentRoutes from './routes/payment';
import settingsRoutes from './routes/settings';
import notificationRoutes from './routes/notifications';

// Try server/.env first, then project root — works for both tsx and node dist/
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(helmet({ contentSecurityPolicy: isProduction ? undefined : false }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/barbers', barberRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, async () => {
  console.log(`✂️  Barbershop server running on http://localhost:${PORT}`);
  const smsOk = !!(process.env.AT_API_KEY && !process.env.AT_API_KEY.includes('your_'));
  const chapaOk = !!(process.env.CHAPA_SECRET_KEY && !process.env.CHAPA_SECRET_KEY.includes('your_'));
  const fbOk = !!(process.env.FIREBASE_PROJECT_ID && !process.env.FIREBASE_PROJECT_ID.includes('your-'));
  console.log(`🔥 Firebase Firestore:     ${fbOk ? '✅ configured' : '❌ FIREBASE_PROJECT_ID missing or placeholder'}`);
  console.log(`📱 SMS (Africa's Talking): ${smsOk ? '✅ configured' : '❌ AT_API_KEY missing or placeholder'}`);
  console.log(`💳 Chapa payment:          ${chapaOk ? '✅ configured' : '❌ CHAPA_SECRET_KEY missing or placeholder'}`);

  if (fbOk) {
    try {
      await autoSeed();
    } catch (err) {
      console.error('Firestore seed error:', err);
    }
  }
});

export default app;
