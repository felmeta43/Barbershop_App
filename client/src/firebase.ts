import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

export async function requestNotificationPermission(): Promise<string | null> {
  if (!messaging || !('Notification' in window)) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    // Register SW with config so it can init Firebase in background
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
