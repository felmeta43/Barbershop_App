import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { useShop } from '../context/ShopContext';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { shop, shopT } = useShop();
  const lang = i18n.language;
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/services', label: t('nav.services') },
    { to: '/book', label: t('nav.book') },
    { to: '/queue', label: t('nav.queue') },
  ];

  const isActive = (to: string) => location.pathname === to;
  const shopName = shopT('name', lang) || 'BarberShop';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-800/95 backdrop-blur-sm border-b border-dark-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
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

          {/* Desktop links */}
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

          {/* Right side */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              to="/book"
              className="hidden md:block bg-barber-500 hover:bg-barber-400 text-dark-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors duration-200"
            >
              {t('nav.book')}
            </Link>
            <Link
              to="/admin"
              className="hidden md:block text-gray-500 hover:text-gray-300 text-xs transition-colors"
            >
              {t('nav.admin')}
            </Link>

            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {open ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-dark-600 py-3 space-y-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2 text-sm rounded-lg transition-colors ${
                  isActive(link.to)
                    ? 'bg-barber-500/20 text-barber-400'
                    : 'text-gray-400 hover:bg-dark-700 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-gray-500 hover:text-gray-300"
            >
              {t('nav.admin')}
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
