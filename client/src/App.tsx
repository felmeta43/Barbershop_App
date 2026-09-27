import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import './i18n';
import { ShopProvider } from './context/ShopContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Services from './pages/Services';
import Booking from './pages/Booking';
import Queue from './pages/Queue';
import PaymentCallback from './pages/PaymentCallback';
import DeviceVerification from './pages/DeviceVerification';
import AdminLogin from './pages/Admin/Login';
import AdminLayout from './pages/Admin/Layout';
import AdminDashboard from './pages/Admin/Dashboard';
import QueueManagement from './pages/Admin/QueueManagement';
import Appointments from './pages/Admin/Appointments';
import ServicesAdmin from './pages/Admin/ServicesAdmin';
import BarbersAdmin from './pages/Admin/BarbersAdmin';
import BanksAdmin from './pages/Admin/BanksAdmin';
import Revenue from './pages/Admin/Revenue';
import ShopSettingsPage from './pages/Admin/ShopSettings';
import DeviceCodesPage from './pages/Admin/DeviceCodes';
import ProtectedRoute from './pages/Admin/ProtectedRoute';
import { ThemeProvider } from './context/ThemeContext';

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchInterval: 10000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

// Only require device verification on native Capacitor platforms (APK/IPA).
// On the web browser, admins and developers can access freely.
const isNative = !!(window as any).Capacitor?.isNativePlatform?.();

function isVerified(): boolean {
  return localStorage.getItem('device_verified') === 'true';
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="content-with-bottom-nav md:pb-0">
        {children}
      </div>
      <BottomNav />
    </>
  );
}

export default function App() {
  const [verified, setVerified] = useState<boolean>(!isNative || isVerified());

  if (!verified) {
    return (
      <QueryClientProvider client={qc}>
        <ThemeProvider>
          <ShopProvider>
            <DeviceVerification onVerified={() => setVerified(true)} />
          </ShopProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
      <ShopProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
            <Route path="/services" element={<PublicLayout><Services /></PublicLayout>} />
            <Route path="/book" element={<PublicLayout><Booking /></PublicLayout>} />
            <Route path="/queue" element={<PublicLayout><Queue /></PublicLayout>} />
            <Route path="/payment/callback" element={<PublicLayout><PaymentCallback /></PublicLayout>} />

            <Route path="/admin" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="queue" element={<QueueManagement />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="services" element={<ServicesAdmin />} />
              <Route path="barbers" element={<BarbersAdmin />} />
              <Route path="banks" element={<BanksAdmin />} />
              <Route path="revenue" element={<Revenue />} />
              <Route path="settings" element={<ShopSettingsPage />} />
              <Route path="devices" element={<DeviceCodesPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1a1a1a', color: '#fff', border: '1px solid #333' },
            success: { iconTheme: { primary: '#e89b00', secondary: '#0a0a0a' } },
          }}
        />
      </ShopProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
