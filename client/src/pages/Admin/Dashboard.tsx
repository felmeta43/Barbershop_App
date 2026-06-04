import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { appointmentsApi, queueApi } from '../../lib/api';
import { Appointment } from '../../lib/types';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const today = new Date().toISOString().split('T')[0];

  const { data: todayAppts = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments', today],
    queryFn: () => appointmentsApi.getAll({ date: today }),
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ['queue-stats'],
    queryFn: queueApi.getStats,
    refetchInterval: 30000,
  });

  const revenue = todayAppts
    .filter((a) => a.payment_status === 'paid')
    .reduce((sum, a) => sum + (a.service_price || a.payment_amount || 0), 0);

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    confirmed: 'bg-blue-500/20 text-blue-400',
    'in-progress': 'bg-green-500/20 text-green-400',
    completed: 'bg-gray-500/20 text-gray-400',
    cancelled: 'bg-red-500/20 text-red-400',
    'no-show': 'bg-red-800/20 text-red-600',
  };

  const statCards = [
    { label: t('admin.today_appointments'), value: todayAppts.length, icon: '📅', color: 'border-blue-500/30 bg-blue-500/10' },
    { label: t('queue.waiting'), value: stats?.waiting || 0, icon: '⏳', color: 'border-yellow-500/30 bg-yellow-500/10' },
    { label: t('queue.status.served'), value: stats?.served || 0, icon: '✅', color: 'border-green-500/30 bg-green-500/10' },
    { label: t('admin.total_revenue'), value: `${revenue} ETB`, icon: '💰', color: 'border-barber-500/30 bg-barber-500/10' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-white font-black text-2xl">{t('admin.dashboard')}</h1>
        <div className="text-gray-500 text-sm">{new Date().toLocaleDateString('en-ET', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-2xl border p-5 ${card.color}`}>
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-white font-black text-2xl">{card.value}</div>
            <div className="text-gray-400 text-sm mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { to: '/admin/queue', label: t('admin.queue_mgmt'), icon: '💈', color: 'bg-barber-500' },
          { to: '/admin/appointments', label: t('admin.appointments'), icon: '📅', color: 'bg-blue-600' },
          { to: '/admin/services', label: t('admin.services'), icon: '✂️', color: 'bg-purple-600' },
          { to: '/admin/barbers', label: t('admin.barbers'), icon: '👨', color: 'bg-green-600' },
        ].map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={`${action.color} hover:opacity-90 text-white rounded-xl p-4 text-center transition-all hover:-translate-y-0.5 shadow-lg`}
          >
            <div className="text-2xl mb-1">{action.icon}</div>
            <div className="text-sm font-semibold">{action.label}</div>
          </Link>
        ))}
      </div>

      {/* Today's appointments table */}
      <div className="bg-dark-700 rounded-2xl border border-dark-600 overflow-hidden">
        <div className="p-5 border-b border-dark-600 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">{t('admin.today_appointments')}</h2>
          <Link to="/admin/appointments" className="text-barber-400 hover:text-barber-300 text-sm">
            {t('common.all')} →
          </Link>
        </div>
        {todayAppts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">{t('queue.empty')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-600">
                  {['#', t('common.customer'), t('common.service'), t('common.time'), t('common.status'), t('payment.title')].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-600">
                {todayAppts.map((appt) => (
                  <tr key={appt.id} className="hover:bg-dark-600/50 transition-colors">
                    <td className="px-4 py-3 text-barber-400 font-bold">#{appt.queue_number}</td>
                    <td className="px-4 py-3">
                      <div className="text-white text-sm font-medium">{appt.customer_name}</div>
                      <div className="text-gray-500 text-xs">{appt.customer_phone}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm">{appt.service_name}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{appt.appointment_time}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[appt.status] || 'bg-gray-500/20 text-gray-400'}`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${appt.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {appt.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
