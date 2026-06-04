import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { appointmentsApi } from '../../lib/api';
import { Appointment } from '../../lib/types';

const STATUS_OPTIONS = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'];

export default function Appointments() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['appointments', dateFilter, statusFilter],
    queryFn: () => appointmentsApi.getAll({ date: dateFilter || undefined, status: statusFilter || undefined }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => appointmentsApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['appointments'] }); },
    onError: () => toast.error(t('common.error')),
  });

  const statusColors: Record<string, string> = {
    pending: 'text-yellow-400',
    confirmed: 'text-blue-400',
    'in-progress': 'text-green-400',
    completed: 'text-gray-400',
    cancelled: 'text-red-400',
    'no-show': 'text-red-600',
  };

  return (
    <div>
      <h1 className="text-white font-black text-2xl mb-6">{t('admin.appointments')}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="bg-dark-700 border border-dark-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-barber-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-dark-700 border border-dark-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-barber-500"
        >
          <option value="">{t('common.all')}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={() => { setDateFilter(''); setStatusFilter(''); }}
          className="text-gray-400 hover:text-white text-sm px-3 py-2 rounded-lg border border-dark-600 hover:border-dark-500 transition-colors"
        >
          Clear
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">{t('queue.empty')}</div>
      ) : (
        <div className="bg-dark-700 rounded-2xl border border-dark-600 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-dark-600 bg-dark-800">
                  {['#', t('common.customer'), t('common.service'), t('common.barber'), t('common.date'), t('common.status'), t('payment.title'), t('common.action')].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-600">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-dark-600/30 transition-colors">
                    <td className="px-4 py-3 text-barber-400 font-bold">#{appt.queue_number}</td>
                    <td className="px-4 py-3">
                      <div className="text-white text-sm font-medium whitespace-nowrap">{appt.customer_name}</div>
                      <div className="text-gray-500 text-xs">{appt.customer_phone}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">{appt.service_name}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm whitespace-nowrap">
                      {appt.barber_name || <span className="text-gray-600">Any</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm whitespace-nowrap">
                      {appt.appointment_date} {appt.appointment_time}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={appt.status}
                        onChange={(e) => statusMutation.mutate({ id: appt.id, status: e.target.value })}
                        className={`bg-dark-600 border border-dark-500 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none ${statusColors[appt.status]}`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${appt.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {appt.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-600 text-xs">{appt.id.slice(0, 8)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
