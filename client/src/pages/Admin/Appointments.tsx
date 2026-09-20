import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { appointmentsApi, banksApi } from '../../lib/api';
import { Appointment } from '../../lib/types';
import { useShop } from '../../context/ShopContext';

const STATUS_OPTIONS = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'];

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Appointments() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { currencySymbol } = useShop();
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  // Track which appointment is having its price edited: id → draft value
  const [editingPrice, setEditingPrice] = useState<Record<string, string>>({});

  const { data: appointments = [], isLoading, isFetching } = useQuery<Appointment[]>({
    queryKey: ['appointments', dateFilter, statusFilter],
    queryFn: () => appointmentsApi.getAll({ date: dateFilter || undefined, status: statusFilter || undefined }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['appointments'] });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => appointmentsApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); invalidate(); },
    onError: () => toast.error(t('common.error')),
  });

  const [screenshotModal, setScreenshotModal] = useState<{ id: string; url: string } | null>(null);

  const verifyMutation = useMutation({
    mutationFn: (id: string) => banksApi.verifyTransfer(id),
    onSuccess: () => { toast.success('Payment verified ✓'); invalidate(); },
    onError: () => toast.error('Failed to verify'),
  });

  const loadScreenshot = async (id: string) => {
    try {
      const data = await banksApi.getScreenshot(id);
      setScreenshotModal({ id, url: data.screenshot });
    } catch {
      toast.error('No screenshot found');
    }
  };

  const paymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { payment_status?: string; payment_amount?: number } }) =>
      appointmentsApi.updatePayment(id, data),
    onSuccess: (_r, vars) => {
      if (vars.data.payment_status === 'paid') toast.success('Marked as paid ✓');
      else if (vars.data.payment_status === 'unpaid') toast.success('Marked as unpaid');
      else toast.success('Amount updated');
      invalidate();
    },
    onError: () => toast.error(t('common.error')),
  });

  const startEditPrice = (appt: Appointment) => {
    setEditingPrice(prev => ({ ...prev, [appt.id]: String(appt.payment_amount ?? '') }));
  };

  const savePrice = (id: string) => {
    const val = parseFloat(editingPrice[id]);
    if (isNaN(val) || val < 0) { toast.error('Enter a valid amount'); return; }
    paymentMutation.mutate({ id, data: { payment_amount: val } });
    setEditingPrice(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const cancelEdit = (id: string) =>
    setEditingPrice(prev => { const n = { ...prev }; delete n[id]; return n; });

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
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-white font-black text-2xl">{t('admin.appointments')}</h1>
        <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 px-2.5 py-1 rounded-full">
          <span className={`w-1.5 h-1.5 rounded-full ${isFetching ? 'bg-barber-400 animate-ping' : 'bg-green-400 animate-pulse'}`} />
          <span className="text-green-400 text-xs font-semibold tracking-widest">LIVE</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setDateFilter(localDateStr())}
          className={`text-sm px-4 py-2 rounded-xl border transition-colors ${
            dateFilter === localDateStr()
              ? 'bg-barber-500 text-dark-900 border-barber-500 font-bold'
              : 'text-gray-400 hover:text-white border-dark-600 hover:border-dark-500'
          }`}
        >
          Today
        </button>
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
          All dates
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {dateFilter ? `No appointments on ${dateFilter}` : 'No appointments found'}
        </div>
      ) : (
        <div className="bg-dark-700 rounded-2xl border border-dark-600 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-dark-600 bg-dark-800">
                  {['#', t('common.customer'), t('common.service'), t('common.barber'), t('common.date'), t('common.status'), 'Amount', 'Payment'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-600">
                {appointments.map((appt) => {
                  const isPriceEditing = appt.id in editingPrice;
                  const isPaid = appt.payment_status === 'paid';

                  return (
                    <tr key={appt.id} className="hover:bg-dark-600/30 transition-colors">
                      {/* Queue # */}
                      <td className="px-4 py-3 text-barber-400 font-bold">#{appt.queue_number}</td>

                      {/* Customer */}
                      <td className="px-4 py-3">
                        <div className="text-white text-sm font-medium whitespace-nowrap">{appt.customer_name}</div>
                        <div className="text-gray-500 text-xs">{appt.customer_phone}</div>
                      </td>

                      {/* Service */}
                      <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">{appt.service_name}</td>

                      {/* Barber */}
                      <td className="px-4 py-3 text-gray-400 text-sm whitespace-nowrap">
                        {appt.barber_name || <span className="text-gray-600">Any</span>}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-gray-400 text-sm whitespace-nowrap">
                        {appt.appointment_date} {appt.appointment_time}
                      </td>

                      {/* Status */}
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

                      {/* Amount — editable */}
                      <td className="px-4 py-3">
                        {isPriceEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editingPrice[appt.id]}
                              onChange={(e) => setEditingPrice(prev => ({ ...prev, [appt.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') savePrice(appt.id); if (e.key === 'Escape') cancelEdit(appt.id); }}
                              className="w-20 bg-dark-600 border border-barber-500 rounded px-2 py-1 text-white text-xs focus:outline-none"
                              autoFocus
                            />
                            <button onClick={() => savePrice(appt.id)} className="text-green-400 hover:text-green-300 text-sm font-bold">✓</button>
                            <button onClick={() => cancelEdit(appt.id)} className="text-gray-500 hover:text-gray-300 text-sm">✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditPrice(appt)}
                            className="flex items-center gap-1 text-gray-300 text-sm hover:text-white group"
                            title="Click to edit amount"
                          >
                            <span>{currencySymbol} {appt.payment_amount ?? '—'}</span>
                            <span className="text-gray-600 group-hover:text-barber-400 text-xs">✏️</span>
                          </button>
                        )}
                      </td>

                      {/* Payment status */}
                      <td className="px-4 py-3">
                        {isPaid ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                              ✓ Paid
                            </span>
                            {appt.payment_method === 'bank_transfer' && (
                              <span className="text-xs text-blue-400">🏦</span>
                            )}
                            <button
                              onClick={() => paymentMutation.mutate({ id: appt.id, data: { payment_status: 'unpaid' } })}
                              className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                              title="Mark as unpaid"
                            >
                              undo
                            </button>
                          </div>
                        ) : appt.payment_method === 'bank_transfer' ? (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs text-blue-400 font-semibold">🏦 {appt.bank_name || 'Bank Transfer'}</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => loadScreenshot(appt.id)}
                                className="text-xs px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 transition-colors whitespace-nowrap"
                              >
                                📸 View
                              </button>
                              <button
                                onClick={() => verifyMutation.mutate(appt.id)}
                                disabled={verifyMutation.isPending}
                                className="text-xs px-2 py-1 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 transition-colors whitespace-nowrap disabled:opacity-50"
                              >
                                ✓ Verify
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => paymentMutation.mutate({ id: appt.id, data: { payment_status: 'paid' } })}
                            disabled={paymentMutation.isPending}
                            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-barber-500/20 text-barber-400 hover:bg-barber-500 hover:text-dark-900 border border-barber-500/40 transition-all disabled:opacity-50 whitespace-nowrap"
                          >
                            Mark as Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Screenshot modal */}
      {screenshotModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setScreenshotModal(null)}>
          <div className="bg-dark-700 rounded-2xl border border-dark-600 p-4 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold">Bank Transfer Screenshot</h3>
              <button onClick={() => setScreenshotModal(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <img src={screenshotModal.url} alt="Transfer screenshot" className="w-full rounded-xl object-contain max-h-[60vh]" />
            <button
              onClick={() => { verifyMutation.mutate(screenshotModal.id); setScreenshotModal(null); }}
              disabled={verifyMutation.isPending}
              className="mt-4 w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              ✓ Verify Payment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
