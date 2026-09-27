import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import { useShop } from '../context/ShopContext';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { shop, shopT } = useShop();
  const lang = i18n.language;
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/services', label: t('nav.services') },
    { to: '/book', label: t('nav.book') },
    { to: '/queue', label: t('nav.queue') },
  ];

  const isActive = (to: string) => location.pathname === to;
  const shopName = shopT('name', lang) || 'BarberShop';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-800/95 backdrop-blur-sm border-b border-dark-600" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-barber-500 rounded-lg flex items-center justify-center overflow-hidden">
              {shop?.logo_url ? (
                <img src={shop.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-dark-900 font-bold text-lg">{shop?.logo_emoji || '✂'}</span>
              )}
            </div>
            <span className="text-white font-bold text-lg tracking-wide">
              {shopName.length > 8 ? shopName : (
                <>
                  {shopName.slice(0, -4) || shopName}
                  <span className="text-barber-400">{shopName.slice(-4) || ''}</span>
                </>
              )}
            </span>
          </Link>

          {/* Desktop: nav links */}
          <div className="hidden md:flex items-center gap-6">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors duration-200 ${
                  isActive(link.to) ? 'text-barber-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop: right controls */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            <Link
              to="/book"
              className="bg-barber-500 hover:bg-barber-400 text-dark-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors duration-200"
            >
              {t('nav.book')}
            </Link>
          </div>

          {/* Mobile: settings button */}
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors rounded-lg"
            aria-label="Settings"
          >
            {settingsOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile: settings panel */}
        {settingsOpen && (
          <div className="md:hidden border-t border-dark-600 py-3 px-1 flex items-center gap-3" onClick={() => setSettingsOpen(false)}>
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        )}
      </div>
    </nav>
  );
}
