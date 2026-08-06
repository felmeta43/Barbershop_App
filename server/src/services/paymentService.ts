import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || '';
const CHAPA_BASE_URL = 'https://api.chapa.co/v1';

export async function initializeChapaPayment(params: {
  amount: number;
  currency: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  txRef: string;
  returnUrl: string;
  callbackUrl: string;
  description: string;
}) {
  if (!CHAPA_SECRET_KEY || CHAPA_SECRET_KEY.includes('your_chapa')) {
    throw new Error('CHAPA_SECRET_KEY is not configured in .env');
  }

  const response = await fetch(`${CHAPA_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amount.toString(),
      currency: params.currency,
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
      phone_number: params.phone,
      tx_ref: params.txRef,
      return_url: params.returnUrl,
      callback_url: params.callbackUrl,
      description: params.description,
      customization: {
        title: 'Barber Pay',        // max 16 chars
        // Chapa only allows letters, numbers, hyphens, underscores, spaces, dots
        description: params.description
          .replace(/&/g, 'and')
          .replace(/[^a-zA-Z0-9\-_ .]/g, '')
          .slice(0, 100),
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as any;
    console.error('Chapa init error:', JSON.stringify(err));
    const msg = typeof err?.message === 'string'
      ? err.message
      : JSON.stringify(err?.message || err);
    throw new Error(msg);
  }

  return response.json() as Promise<{
    message: string;
    status: string;
    data: { checkout_url: string };
  }>;
}

export async function verifyChapaPayment(txRef: string) {
  if (!CHAPA_SECRET_KEY || CHAPA_SECRET_KEY.includes('your_chapa')) {
    throw new Error('CHAPA_SECRET_KEY is not configured in .env');
  }

  const response = await fetch(`${CHAPA_BASE_URL}/transaction/verify/${txRef}`, {
    headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error('Chapa verify error:', JSON.stringify(err));
    throw new Error('Payment verification failed');
  }

  return response.json() as Promise<{
    message: string;
    status: string;
    data: { status: string; amount: number; currency: string; tx_ref: string };
  }>;
}
