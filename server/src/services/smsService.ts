import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';

dotenv.config();

const AT_API_KEY = process.env.AT_API_KEY || '';
const AT_USERNAME = process.env.AT_USERNAME || 'sandbox';
const AT_SENDER_ID = process.env.AT_SENDER_ID || 'BarberShop';

async function sendAfricasTalking(to: string, message: string): Promise<boolean> {
  try {
    const url = AT_USERNAME === 'sandbox'
      ? 'https://api.sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging';

    const params = new URLSearchParams({
      username: AT_USERNAME,
      to,
      message,
      from: AT_SENDER_ID,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        apiKey: AT_API_KEY,
      },
      body: params.toString(),
    });

    return response.ok;
  } catch (err) {
    console.error('SMS send error:', err);
    return false;
  }
}

export async function sendBookingConfirmation(params: {
  phone: string;
  customerName: string;
  serviceName: string;
  barberName: string;
  date: string;
  time: string;
  queueNumber: number;
  appointmentId: string;
  lang?: string;
}) {
  const { phone, customerName, serviceName, barberName, date, time, queueNumber, appointmentId, lang } = params;

  let message = '';
  if (lang === 'am') {
    message = `ሰላም ${customerName}! ቀጠሮዎ ተረጋግጧል።\nአገልግሎት: ${serviceName}\nባርበር: ${barberName}\nቀን: ${date} ${time}\nተራ ቁጥር: #${queueNumber}\nID: ${appointmentId.slice(0, 8)}`;
  } else if (lang === 'om') {
    message = `Nagaan ${customerName}! Beellamni keessan mirkaneeffameera.\nTajaajila: ${serviceName}\nBarbar: ${barberName}\nGuyyaa: ${date} ${time}\nLakkofsa tarree: #${queueNumber}\nID: ${appointmentId.slice(0, 8)}`;
  } else {
    message = `Hi ${customerName}! Your appointment is confirmed.\nService: ${serviceName}\nBarber: ${barberName}\nDate: ${date} at ${time}\nQueue #${queueNumber}\nID: ${appointmentId.slice(0, 8)}`;
  }

  const success = await sendAfricasTalking(phone, message);
  logSms(phone, message, success ? 'sent' : 'failed', appointmentId);
  return success;
}

export async function sendQueueCallNotification(params: {
  phone: string;
  customerName: string;
  queueNumber: number;
  barberName: string;
  appointmentId: string;
  lang?: string;
}) {
  const { phone, customerName, queueNumber, barberName, appointmentId, lang } = params;

  let message = '';
  if (lang === 'am') {
    message = `ሰላም ${customerName}! ተራዎ ደርሷል (#${queueNumber}).\nእባክዎ ወደ ${barberName} ወንበር ይምጡ።`;
  } else if (lang === 'om') {
    message = `Nagaan ${customerName}! Tarreen keessan gahee jira (#${queueNumber}).\nGara ${barberName} dhufu maaloo.`;
  } else {
    message = `Hi ${customerName}! It's your turn (#${queueNumber}).\nPlease come to ${barberName}'s chair now.`;
  }

  const success = await sendAfricasTalking(phone, message);
  logSms(phone, message, success ? 'sent' : 'failed', appointmentId);
  return success;
}

export async function sendAppointmentReminder(params: {
  phone: string;
  customerName: string;
  date: string;
  time: string;
  appointmentId: string;
  lang?: string;
}) {
  const { phone, customerName, date, time, appointmentId, lang } = params;

  let message = '';
  if (lang === 'am') {
    message = `ሰላም ${customerName}! ነገ ${date} ሰዓት ${time} ላይ ቀጠሮ አለዎት። እንዲሁም አስታወሱ!`;
  } else if (lang === 'om') {
    message = `Nagaan ${customerName}! Beellama ${date} sa'aa ${time} qabaatta. Yaadadhu!`;
  } else {
    message = `Hi ${customerName}! Reminder: Appointment on ${date} at ${time}. See you soon!`;
  }

  const success = await sendAfricasTalking(phone, message);
  logSms(phone, message, success ? 'sent' : 'failed', appointmentId);
  return success;
}

function logSms(phone: string, message: string, status: string, appointmentId?: string) {
  try {
    db.prepare(`
      INSERT INTO sms_logs (id, phone, message, status, appointment_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), phone, message, status, appointmentId || null);
  } catch {}
}
