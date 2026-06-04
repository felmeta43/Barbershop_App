import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { paymentApi } from '../lib/api';

export default function PaymentCallback() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [searchParams] = useSearchParams();
  const txRef = searchParams.get('tx_ref');
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');

  useEffect(() => {
    if (!txRef) { setStatus('failed'); return; }
    paymentApi.verify(txRef).then((res) => {
      setStatus(res.data?.status === 'success' ? 'success' : 'failed');
    }).catch(() => setStatus('failed'));
  }, [txRef]);

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center pt-16">
      <div className="max-w-md w-full mx-4">
        <div className="bg-dark-700 rounded-3xl p-8 border border-dark-600 text-center animate-fade-in">
          {status === 'loading' && (
            <>
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <span className="text-4xl">💳</span>
              </div>
              <p className={`text-white text-lg font-semibold ${lang === 'am' ? 'font-amharic' : ''}`}>
                {t('payment.verify')}
              </p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">✅</span>
              </div>
              <h2 className={`text-2xl font-black text-white mb-4 ${lang === 'am' ? 'font-amharic' : ''}`}>
                {t('payment.success')}
              </h2>
              <p className="text-gray-400 mb-8 text-sm">TX: {txRef}</p>
              <Link to="/" className="inline-block bg-barber-500 hover:bg-barber-400 text-dark-900 font-bold px-8 py-3 rounded-xl transition-colors">
                {t('payment.go_home')}
              </Link>
            </>
          )}
          {status === 'failed' && (
            <>
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">❌</span>
              </div>
              <h2 className={`text-2xl font-black text-white mb-4 ${lang === 'am' ? 'font-amharic' : ''}`}>
                {t('payment.failed')}
              </h2>
              <div className="flex gap-3 mt-8">
                <Link to="/" className="flex-1 bg-dark-600 text-gray-300 font-medium py-3 rounded-xl text-center">
                  {t('payment.go_home')}
                </Link>
                <Link to="/book" className="flex-1 bg-barber-500 text-dark-900 font-bold py-3 rounded-xl text-center">
                  {t('common.retry')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
