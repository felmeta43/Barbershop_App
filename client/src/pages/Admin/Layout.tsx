import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import ThemeToggle from '../../components/ThemeToggle';
import { useShop } from '../../context/ShopContext';
import { requestNotificationPermission } from '../../firebase';
import api from '../../lib/api';

export default function AdminLayout() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { shop, shopT } = useShop();

  const user = JSON.parse(localStorage.getItem('admin_user') || '{}');

  useEffect(() => {
    // Request push notification permission and register FCM token
    requestNotificationPermission().then((token) => {
      if (token) {
        api.post('/notifications/token', { token }).catch(() => {});
      }
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin');
  };

  const navItems = [
    { to: '/admin/dashboard', icon: '📊', label: t('admin.dashboard') },
    { to: '/admin/queue', icon: '💈', label: t('admin.queue_mgmt') },
    { to: '/admin/appointments', icon: '📅', label: t('admin.appointments') },
    { to: '/admin/services', icon: '✂️', label: t('admin.services') },
    { to: '/admin/barbers', icon: '👨', label: t('admin.barbers') },
    { to: '/admin/banks', icon: '🏦', label: 'Bank Accounts' },
    { to: '/admin/revenue', icon: '💰', label: 'Revenue' },
    { to: '/admin/settings', icon: '⚙️', label: 'Shop Settings' },
  ];

  const shopName = shopT('name', lang) || 'BarberShop';

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-dark-800 border-r border-dark-600 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Logo */}
        <div className="p-6 border-b border-dark-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-barber-500 rounded-xl flex items-center justify-center overflow-hidden">
              {shop?.logo_url ? (
                <img src={shop.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-dark-900 font-bold text-xl">{shop?.logo_emoji || '✂'}</span>
              )}
            </div>
            <div>
              <div className="text-white font-bold truncate max-w-[120px]">{shopName}</div>
              <div className="text-barber-400 text-xs">Admin Panel</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-barber-500/20 text-barber-400 border border-barber-500/30'
                    : 'text-gray-400 hover:bg-dark-700 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-dark-600 space-y-3">
          <ThemeToggle />
          <LanguageSwitcher />
          <div className="flex items-center justify-between">
            <div className="text-gray-400 text-sm">{user.username}</div>
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 text-sm transition-colors">
              {t('admin.logout')} →
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-dark-800 border-b border-dark-600 px-4 py-3 flex items-center gap-3 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-white font-bold">{shopName} Admin</span>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
