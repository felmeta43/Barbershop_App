import dotenv from 'dotenv';

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
        title: 'Barbershop Payment',
        description: params.description,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any)?.message || 'Chapa payment initialization failed');
  }

  return response.json() as Promise<{
    message: string;
    status: string;
    data: { checkout_url: string };
  }>;
}

export async function verifyChapaPayment(txRef: string) {
  const response = await fetch(`${CHAPA_BASE_URL}/transaction/verify/${txRef}`, {
    headers: {
      Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error('Payment verification failed');
  }

  return response.json() as Promise<{
    message: string;
    status: string;
    data: {
      status: string;
      amount: number;
      currency: string;
      tx_ref: string;
    };
  }>;
}
