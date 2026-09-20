import { db } from '../firebase';

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export async function autoUpdateQueueStatuses(): Promise<void> {
  const today = localToday();
  const now = currentTimeStr();

  try {
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
