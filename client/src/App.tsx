import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import './i18n';
import { ShopProvider } from './context/ShopContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Services from './pages/Services';
import Booking from './pages/Booking';
import Queue from './pages/Queue';
import PaymentCallback from './pages/PaymentCallback';
import AdminLogin from './pages/Admin/Login';
import AdminLayout from './pages/Admin/Layout';
import AdminDashboard from './pages/Admin/Dashboard';
import QueueManagement from './pages/Admin/QueueManagement';
import Appointments from './pages/Admin/Appointments';
import ServicesAdmin from './pages/Admin/ServicesAdmin';
import BarbersAdmin from './pages/Admin/BarbersAdmin';
import BanksAdmin from './pages/Admin/BanksAdmin';
import ShopSettingsPage from './pages/Admin/ShopSettings';
import ProtectedRoute from './pages/Admin/ProtectedRoute';

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,          // always consider data stale so refetch fires on focus
      refetchInterval: 10000, // poll every 10 seconds while tab is open
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
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
              <Route path="settings" element={<ShopSettingsPage />} />
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
    </QueryClientProvider>
  );
}
