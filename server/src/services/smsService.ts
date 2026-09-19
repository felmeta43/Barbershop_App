import dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../firebase';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const AT_API_KEY = process.env.AT_API_KEY || '';
const AT_USERNAME = process.env.AT_USERNAME || 'sandbox';
const AT_SENDER_ID = process.env.AT_SENDER_ID || '';

// Normalize Ethiopian phone numbers to E.164 format (+2519XXXXXXXX)
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('2519') || digits.startsWith('2517')) return `+${digits}`;
  if (digits.startsWith('09') || digits.startsWith('07')) return `+251${digits.slice(1)}`;
  if (digits.startsWith('9') || digits.startsWith('7')) return `+251${digits}`;
  if (digits.startsWith('251')) return `+${digits}`;
  return phone; // already formatted or unknown format
}

async function sendAfricasTalking(to: string, message: string): Promise<boolean> {
  if (!AT_API_KEY || AT_API_KEY === 'your_africastalking_api_key') {
    console.warn('SMS skipped: AT_API_KEY not configured');
    return false;
  }

  try {
    const url = AT_USERNAME === 'sandbox'
      ? 'https://api.sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging';

    const normalizedTo = normalizePhone(to);
    const params = new URLSearchParams({ username: AT_USERNAME, to: normalizedTo, message });
    // Only include sender ID if explicitly set — unregistered IDs cause rejection on many operators
    if (AT_SENDER_ID) params.set('from', AT_SENDER_ID);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        apiKey: AT_API_KEY,
      },
      body: params.toString(),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const body = await response.json().catch(() => ({})) as any;
    if (!response.ok) {
      console.error('SMS API error:', JSON.stringify(body));
      return false;
    }

    // Log the per-recipient status so we can see if delivery was queued or rejected
    const recipients = body?.SMSMessageData?.Recipients || [];
    for (const r of recipients) {
      if (r.status === 'Success' || r.statusCode === 101) {
        console.log(`✅ SMS queued for ${r.number} (cost: ${r.cost})`);
      } else {
        console.warn(`⚠️  SMS to ${r.number} status: ${r.status} — ${
          r.statusCode === 402 ? 'Insufficient balance on Africa\'s Talking account' :
          r.statusCode === 403 ? 'Number not in sandbox — add it at africastalking.com/sandbox' :
          `code ${r.statusCode}`
        }`);
      }
    }
    return recipients.some((r: any) => r.status === 'Success' || r.statusCode === 101);
  } catch (err: any) {
    if (err?.name === 'AbortError' || err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
      console.error('SMS timeout: Cannot reach Africa\'s Talking servers. Check that Node.js is allowed through Windows Firewall (outbound HTTPS/port 443).');
    } else {
      console.error('SMS send error:', err?.message || err);
    }
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
  const id = uuidv4();
  db.collection('sms_logs').doc(id).set({
    id, phone, message, status,
    appointment_id: appointmentId || null,
    created_at: new Date().toISOString(),
  }).catch(() => {});
}
