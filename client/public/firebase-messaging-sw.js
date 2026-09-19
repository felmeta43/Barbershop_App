importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Config is passed as a URL query param when the SW is registered
const url = new URL(self.location.href);
const configParam = url.searchParams.get('config');

if (configParam) {
  try {
    const config = JSON.parse(decodeURIComponent(configParam));
    firebase.initializeApp(config);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      self.registration.showNotification(title || 'New Appointment', {
        body: body || 'A customer has booked an appointment.',
        icon: '/favicon.ico',
      });
    });
  } catch (e) {
    console.error('SW Firebase init error:', e);
  }
}
