import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { initializeDatabase, autoSeed } from './database';
import authRoutes from './routes/auth';
import barberRoutes from './routes/barbers';
import serviceRoutes from './routes/services';
import appointmentRoutes from './routes/appointments';
import queueRoutes from './routes/queue';
import paymentRoutes from './routes/payment';
import settingsRoutes from './routes/settings';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

initializeDatabase();
autoSeed();

app.use(helmet({ contentSecurityPolicy: isProduction ? undefined : false }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

const bookingLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });
app.use('/api/appointments', bookingLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/barbers', barberRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/settings', settingsRoutes);

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

app.listen(PORT, () => {
  console.log(`✂️  Barbershop server running on http://localhost:${PORT}`);
});

export default app;
