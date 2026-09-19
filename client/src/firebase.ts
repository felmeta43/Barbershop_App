import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const fcmConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

if (fcmConfigured) {
  try {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    if (typeof window !== 'undefined') messaging = getMessaging(app);
  } catch (err) {
    console.warn('Firebase init skipped:', err);
  }
}

export { messaging };

export async function requestNotificationPermission(): Promise<string | null> {
  if (!fcmConfigured || !messaging || !('Notification' in window)) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const configParam = encodeURIComponent(JSON.stringify(firebaseConfig));
    const swReg = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?config=${configParam}`
    );

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });
    return token || null;
  } catch (err) {
    console.error('FCM token error:', err);
    return null;
  }
}

export { onMessage };
export default app;
