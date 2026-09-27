import { useState } from 'react';
import api from '../lib/api';
import { useShop } from '../context/ShopContext';
import { useTranslation } from 'react-i18next';

function getDeviceId(): string {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('device_id', id);
  }
  return id;
}

interface Props {
  onVerified: () => void;
}

export default function DeviceVerification({ onVerified }: Props) {
  const { shop } = useShop();
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 6) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/device/verify', {
        code: code.trim().toUpperCase(),
        device_id: getDeviceId(),
      });
      localStorage.setItem('device_verified', 'true');
      onVerified();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const shopName = shop?.name || 'BarberShop';
  const logo = shop?.logo_url;
  const emoji = shop?.logo_emoji || '✂';

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center px-6" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-4">
        <div className="w-20 h-20 bg-barber-500 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg shadow-barber-500/20">
          {logo ? (
            <img src={logo} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-dark-900 text-4xl">{emoji}</span>
          )}
        </div>
        <div className="text-center">
          <h1 className={`text-2xl font-black text-white ${lang === 'am' ? 'font-amharic' : ''}`}>{shopName}</h1>
          <p className="text-barber-400 text-sm font-medium tracking-wider mt-1">DEVICE VERIFICATION</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-dark-800 border border-dark-600 rounded-2xl p-6 shadow-xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔐</div>
          <h2 className="text-white font-bold text-lg">Enter Access Code</h2>
          <p className="text-gray-400 text-sm mt-1">
            Contact the barbershop to get your 6-character device code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
              setError('');
            }}
            placeholder="XXXXXX"
            maxLength={6}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-4 text-white text-center text-3xl font-black tracking-[0.4em] focus:outline-none focus:border-barber-500 transition-colors placeholder:text-dark-400 placeholder:text-2xl placeholder:tracking-widest"
          />

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full bg-barber-500 hover:bg-barber-400 disabled:opacity-40 disabled:cursor-not-allowed text-dark-900 font-bold py-4 rounded-xl text-base transition-colors"
          >
            {loading ? 'Verifying…' : 'Verify Device'}
          </button>
        </form>

        <p className="text-gray-600 text-xs text-center mt-5 leading-relaxed">
          This is a one-time verification. Once verified, you won't need to enter the code again.
        </p>
      </div>
    </div>
  );
}

export { getDeviceId };
