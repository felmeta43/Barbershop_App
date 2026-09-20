import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.barbershop.app',
  appName: 'BarberShop',
  webDir: 'dist',
  // When building for production, set SERVER_URL to your deployed server address
  // e.g., https://your-app.onrender.com
  // For local network use: http://192.168.x.x:5000
  server: {
    // Uncomment and set your server URL for production builds:
    // url: 'https://your-deployed-server.com',
    // androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    StatusBar: {
      // Prevent the WebView from drawing behind the status bar
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#111111',
    },
  },
};

export default config;
