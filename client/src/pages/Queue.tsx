import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { queueApi } from '../lib/api';
import { QueueEntry, QueueStats } from '../lib/types';

export default function Queue() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [checkNumber, setCheckNumber] = useState('');

  const { data: queue = [], refetch, isFetching } = useQuery<QueueEntry[]>({
    queryKey: ['queue-today'],
    queryFn: queueApi.getToday,
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery<QueueStats>({
    queryKey: ['queue-stats'],
    queryFn: queueApi.getStats,
    refetchInterval: 30000,
  });

  const waiting = queue.filter((q) => q.status === 'waiting');
  const active = queue.filter((q) => q.status === 'called');

  const found = checkNumber
    ? queue.find((q) => q.queue_position.toString() === checkNumber.trim())
    : null;

  const statusColors: Record<string, string> = {
    waiting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    called: 'bg-green-500/20 text-green-400 border-green-500/30',
    served: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    skipped: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className="min-h-screen bg-dark-900 pt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className={`text-4xl font-black text-white mb-3 ${lang === 'am' ? 'font-amharic' : ''}`}>
            {t('queue.title')}
          </h1>
          <p className="text-gray-400">{t('queue.subtitle')}</p>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-4 text-barber-400 hover:text-barber-300 text-sm font-medium border border-barber-500/30 hover:border-barber-500/60 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
          >
            {isFetching ? '...' : `↺ ${t('queue.refresh')}`}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: t('queue.status.waiting'), value: stats?.waiting || 0, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
            { label: t('queue.status.called'), value: stats?.called || 0, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
            { label: t('queue.status.served'), value: stats?.served || 0, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
            { label: t('admin.stats.total'), value: stats?.total || 0, color: 'text-barber-400', bg: 'bg-barber-500/10 border-barber-500/20' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-4 text-center ${s.bg}`}>
              <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Check your number */}
        <div className="bg-dark-700 rounded-2xl p-6 border border-dark-600 mb-8">
          <h2 className={`text-white font-bold text-xl mb-4 ${lang === 'am' ? 'font-amharic' : ''}`}>
            🔍 {t('queue.your_number')}
          </h2>
          <div className="flex gap-3">
            <input
              type="number"
              value={checkNumber}
              onChange={(e) => setCheckNumber(e.target.value)}
              placeholder="#"
              className="w-32 bg-dark-600 border border-dark-500 rounded-lg px-4 py-3 text-white text-center text-2xl font-bold focus:outline-none focus:border-barber-500"
            />
            {found && (
              <div className={`flex-1 flex items-center gap-4 px-4 py-3 rounded-lg border ${statusColors[found.status] || ''}`}>
                <div>
                  <div className="font-bold text-lg">#{found.queue_position} — {found.customer_name}</div>
                  <div className="text-sm opacity-75">{found.service_name} · {found.appointment_time}</div>
                </div>
                <span className={`ml-auto text-xs font-bold px-3 py-1 rounded-full border ${statusColors[found.status]}`}>
                  {t(`queue.status.${found.status}`)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Currently Being Served */}
        {active.length > 0 && (
          <div className="mb-8">
            <h2 className="text-green-400 font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              {t('queue.status.called')}
            </h2>
            <div className="space-y-3">
              {active.map((entry) => (
                <div key={entry.id} className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-4">
                  <div className="text-4xl font-black text-green-400">#{entry.queue_position}</div>
                  <div className="flex-1">
                    <div className="text-white font-bold">{entry.customer_name}</div>
                    <div className="text-gray-400 text-sm">{entry.service_name}</div>
                    {entry.barber_name && <div className="text-green-400 text-xs">→ {entry.barber_name}</div>}
                  </div>
                  <div className="text-green-400 text-2xl">💈</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waiting Queue */}
        <div>
          <h2 className="text-yellow-400 font-bold text-lg mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full" />
            {t('queue.waiting')} ({waiting.length})
          </h2>
          {waiting.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="text-6xl mb-4">💈</div>
              <p className={lang === 'am' ? 'font-amharic' : ''}>{t('queue.empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {waiting.map((entry, idx) => {
                const estWait = idx * 25;
                return (
                  <div key={entry.id} className="bg-dark-700 border border-dark-600 rounded-xl p-4 flex items-center gap-4 hover:border-barber-500/30 transition-colors">
                    <div className="text-3xl font-black text-barber-400 w-12 text-center">
                      #{entry.queue_position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold truncate">{entry.customer_name}</div>
                      <div className="text-gray-400 text-sm">{entry.service_name}</div>
                      {entry.barber_name && <div className="text-gray-500 text-xs">{entry.barber_name}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-gray-400 text-sm">{entry.appointment_time}</div>
                      {estWait > 0 && (
                        <div className="text-yellow-500 text-xs">~{estWait} {t('queue.minutes')}</div>
                      )}
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      {t('queue.status.waiting')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
