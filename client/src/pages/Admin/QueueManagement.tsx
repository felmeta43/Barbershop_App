import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { queueApi } from '../../lib/api';
import { QueueEntry, QueueStats } from '../../lib/types';

export default function QueueManagement() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: queue = [], refetch, isFetching } = useQuery<QueueEntry[]>({
    queryKey: ['admin-queue'],
    queryFn: queueApi.getToday,
  });

  const { data: stats } = useQuery<QueueStats>({
    queryKey: ['queue-stats'],
    queryFn: queueApi.getStats,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-queue'] });
    qc.invalidateQueries({ queryKey: ['queue-stats'] });
  };

  const callMutation = useMutation({
    mutationFn: (id: string) => queueApi.call(id),
    onSuccess: () => { toast.success('Customer called! SMS sent.'); invalidate(); },
    onError: () => toast.error(t('common.error')),
  });

  const serveMutation = useMutation({
    mutationFn: (id: string) => queueApi.serve(id),
    onSuccess: () => { toast.success('Marked as served!'); invalidate(); },
    onError: () => toast.error(t('common.error')),
  });

  const skipMutation = useMutation({
    mutationFn: (id: string) => queueApi.skip(id),
    onSuccess: () => { toast.success('Customer skipped.'); invalidate(); },
    onError: () => toast.error(t('common.error')),
  });

  const statusColors: Record<string, string> = {
    waiting: 'border-yellow-500/40 bg-yellow-500/5',
    called: 'border-green-500/40 bg-green-500/10',
    served: 'border-blue-500/40 bg-blue-500/5',
    skipped: 'border-red-500/40 bg-red-500/5',
  };

  const statusBadge: Record<string, string> = {
    waiting: 'bg-yellow-500/20 text-yellow-400',
    called: 'bg-green-500/20 text-green-400',
    served: 'bg-blue-500/20 text-blue-400',
    skipped: 'bg-red-500/20 text-red-400',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white font-black text-2xl">{t('admin.queue_mgmt')}</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-3 py-1.5 rounded-full">
            <span className={`w-2 h-2 rounded-full ${isFetching ? 'bg-barber-400 animate-ping' : 'bg-green-400 animate-pulse'}`} />
            <span className="text-green-400 text-xs font-semibold tracking-widest">
              {isFetching ? 'UPDATING' : 'LIVE'}
            </span>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-barber-400 hover:text-barber-300 text-sm border border-barber-500/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            ↺ {t('queue.refresh')}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: t('admin.stats.total'), value: stats?.total || 0, color: 'text-white' },
          { label: t('queue.waiting'), value: stats?.waiting || 0, color: 'text-yellow-400' },
          { label: t('queue.status.called'), value: stats?.called || 0, color: 'text-green-400' },
          { label: t('queue.status.served'), value: stats?.served || 0, color: 'text-blue-400' },
        ].map((s) => (
          <div key={s.label} className="bg-dark-700 rounded-xl border border-dark-600 p-4 text-center">
            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Queue cards */}
      {queue.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">💈</div>
          <p>{t('queue.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-2xl border p-4 sm:p-5 transition-all ${statusColors[entry.status] || 'border-dark-600 bg-dark-700'}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Queue number */}
                <div className="text-4xl font-black text-barber-400 w-16 text-center shrink-0">
                  #{entry.queue_position}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-lg">{entry.customer_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge[entry.status]}`}>
                      {t(`queue.status.${entry.status}`)}
                    </span>
                    {entry.payment_status === 'paid' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">✓ Paid</span>
                    )}
                  </div>
                  <div className="text-gray-400 text-sm mt-1">
                    📱 {entry.customer_phone} · ✂️ {entry.service_name}
                    {entry.barber_name && ` · ${entry.barber_name}`}
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    ⏰ {entry.appointment_time} · ⏱ {entry.duration_minutes} min
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  {entry.status === 'waiting' && (
                    <>
                      <button
                        onClick={() => callMutation.mutate(entry.id)}
                        disabled={callMutation.isPending}
                        className="bg-green-600 hover:bg-green-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        📢 {t('admin.call_next')}
                      </button>
                      <button
                        onClick={() => skipMutation.mutate(entry.id)}
                        disabled={skipMutation.isPending}
                        className="bg-red-900/50 hover:bg-red-800 text-red-400 font-semibold text-sm px-3 py-2 rounded-lg transition-colors"
                      >
                        {t('admin.skip')}
                      </button>
                    </>
                  )}
                  {entry.status === 'called' && (
                    <button
                      onClick={() => serveMutation.mutate(entry.id)}
                      disabled={serveMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      ✅ {t('admin.mark_served')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
