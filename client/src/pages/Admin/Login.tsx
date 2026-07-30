import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { authApi } from '../../lib/api';
import { useShop } from '../../context/ShopContext';

export default function AdminLogin() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const { shop, shopT } = useShop();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const shopName = shopT('name', lang) || 'BarberShop';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login(username, password);
      localStorage.setItem('admin_token', res.token);
      localStorage.setItem('admin_user', JSON.stringify(res.user));
      navigate('/admin/dashboard');
    } catch (err: any) {
      if (err?.response?.status === 401) {
        toast.error('Invalid username or password');
      } else {
        toast.error('Cannot reach server — make sure the server is running on port 5000.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-barber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden">
            {shop?.logo_url ? (
              <img src={shop.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-dark-900 text-3xl font-bold">{shop?.logo_emoji || '✂'}</span>
            )}
          </div>
          <h1 className="text-white font-black text-2xl">{shopName} Admin</h1>
        </div>
        <div className="bg-dark-700 rounded-3xl p-8 border border-dark-600">
          <h2 className={`text-white font-bold text-xl mb-6 ${lang === 'am' ? 'font-amharic' : ''}`}>
            {t('admin.login')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">{t('admin.username')}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-dark-600 border border-dark-500 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-barber-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">{t('admin.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark-600 border border-dark-500 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-barber-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-barber-500 hover:bg-barber-400 disabled:opacity-50 text-dark-900 font-bold py-3 rounded-xl transition-colors mt-2"
            >
              {loading ? t('common.loading') : t('admin.sign_in')}
            </button>
          </form>
          <p className="text-gray-600 text-xs text-center mt-6">Default: admin / admin123</p>
        </div>
      </div>
    </div>
  );
}
