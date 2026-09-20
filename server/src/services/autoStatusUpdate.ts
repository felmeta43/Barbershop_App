import { v4 as uuidv4 } from 'uuid';
import { db } from '../firebase';

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Creates queue entries for any appointments that don't have one yet.
export async function resyncQueueFromAppointments(date: string): Promise<number> {
  try {
    const [apptSnap, qSnap] = await Promise.all([
      db.collection('appointments')
        .where('appointment_date', '==', date)
        .where('status', '!=', 'cancelled')
        .get(),
      db.collection('queue')
        .where('appointment_date', '==', date)
        .get(),
    ]);

    const existingApptIds = new Set(qSnap.docs.map((d) => d.data().appointment_id as string));
    const missing = apptSnap.docs.filter((d) => !existingApptIds.has(d.id));
    if (missing.length === 0) return 0;

    const batch = db.batch();
    missing.forEach((apptDoc, idx) => {
      const appt = apptDoc.data() as any;
      const queueId = uuidv4();
      const queueRef = db.collection('queue').doc(queueId);

      // Map appointment status → queue status
      let qStatus = 'waiting';
      if (appt.status === 'in-progress') qStatus = 'called';
      else if (appt.status === 'completed') qStatus = 'served';
      else if (appt.status === 'no-show') qStatus = 'skipped';

      batch.set(queueRef, {
        id: queueId,
        appointment_id: appt.id,
        appointment_date: appt.appointment_date,
        customer_name: appt.customer_name,
        customer_phone: appt.customer_phone,
        appointment_time: appt.appointment_time,
        appointment_status: appt.status,
        payment_status: appt.payment_status || 'unpaid',
        service_name: appt.service_name,
        duration_minutes: appt.duration_minutes || null,
        barber_name: appt.barber_name || null,
        queue_position: appt.queue_number || (qSnap.size + idx + 1),
        status: qStatus,
        called_at: null,
        served_at: null,
        created_at: appt.created_at || new Date().toISOString(),
      });
    });

    await batch.commit();
    console.log(`Resynced ${missing.length} missing queue entries for ${date}`);
    return missing.length;
  } catch (err) {
    console.error('resyncQueueFromAppointments error:', err);
    return 0;
  }
}

export async function autoUpdateQueueStatuses(): Promise<void> {
  const today = localToday();
  const now = currentTimeStr();

  try {
    // 0. Ensure today's appointments all have queue entries
    await resyncQueueFromAppointments(today);

    // 1. Past-day entries still active → auto-complete
    const pastSnap = await db.collection('queue')
      .where('appointment_date', '<', today)
      .get();

    const pastDocs = pastSnap.docs.filter((d) => !['served', 'skipped'].includes(d.data().status));
    if (pastDocs.length > 0) {
      const batch = db.batch();
      pastDocs.forEach((doc) => {
        const data = doc.data();
        batch.update(doc.ref, {
          status: 'served',
          served_at: new Date().toISOString(),
          appointment_status: 'completed',
        });
        batch.update(db.collection('appointments').doc(data.appointment_id), { status: 'completed' });
      });
      await batch.commit();
      console.log(`Auto-completed ${pastDocs.length} past-day queue entries`);
    }

    // 2. Today's waiting entries whose appointment_time has arrived → in-progress
    const todaySnap = await db.collection('queue')
      .where('appointment_date', '==', today)
      .get();

    const startDocs = todaySnap.docs.filter((d) => {
      const data = d.data();
      return data.status === 'waiting' && data.appointment_time <= now;
    });

    if (startDocs.length > 0) {
      const batch = db.batch();
      startDocs.forEach((doc) => {
        const data = doc.data();
        batch.update(doc.ref, { status: 'called', called_at: new Date().toISOString() });
        batch.update(db.collection('appointments').doc(data.appointment_id), { status: 'in-progress' });
      });
      await batch.commit();
      console.log(`Auto-started ${startDocs.length} queue entries to in-progress`);
    }
  } catch (err) {
    console.error('Auto-status update error:', err);
  }
}
