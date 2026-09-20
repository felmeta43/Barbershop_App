import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appointmentsApi } from '../../lib/api';
import { Appointment } from '../../lib/types';
import { useShop } from '../../context/ShopContext';

type Period = 'today' | 'week' | 'month' | 'range';

function localDateStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function Revenue() {
  const { currencySymbol } = useShop();
  const [period, setPeriod] = useState<Period>('today');
  const [rangeFrom, setRangeFrom] = useState(localDateStr(-7));
  const [rangeTo, setRangeTo] = useState(localDateStr());

  const today = localDateStr();

  const dateFrom = useMemo(() => {
    if (period === 'today') return today;
    if (period === 'week') return weekStart();
    if (period === 'month') return monthStart();
    return rangeFrom;
  }, [period, today, rangeFrom]);

  const dateTo = useMemo(() => {
    if (period === 'today') return today;
    return period === 'range' ? rangeTo : today;
  }, [period, today, rangeTo]);

  // Fetch all appointments in range (no date filter on API means all; we filter client-side)
  const { data: allAppts = [], isFetching } = useQuery<Appointment[]>({
    queryKey: ['revenue-appts', dateFrom, dateTo],
    queryFn: () => appointmentsApi.getAll({}),
    refetchInterval: 30000,
  });

  // Filter to the selected date range and only paid
  const inRange = useMemo(() =>
    allAppts.filter((a) => a.appointment_date >= dateFrom && a.appointment_date <= dateTo),
    [allAppts, dateFrom, dateTo]
  );

  const paidAppts = useMemo(() => inRange.filter((a) => a.payment_status === 'paid'), [inRange]);

  const totalRevenue = paidAppts.reduce((s, a) => s + (a.payment_amount || a.service_price || 0), 0);
  const pendingRevenue = inRange
    .filter((a) => a.payment_status !== 'paid' && a.payment_status !== 'declined')
    .reduce((s, a) => s + (a.payment_amount || a.service_price || 0), 0);

  // Group paid by date for the bar chart / breakdown
  const byDate = useMemo(() => {
    const map: Record<string, number> = {};
    paidAppts.forEach((a) => {
      map[a.appointment_date] = (map[a.appointment_date] || 0) + (a.payment_amount || a.service_price || 0);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [paidAppts]);

  const maxBar = Math.max(...byDate.map(([, v]) => v), 1);

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'range', label: 'Custom Range' },
  ];

  const paymentMethodBreakdown = useMemo(() => {
    const chapa = paidAppts.filter((a) => a.payment_method === 'chapa').reduce((s, a) => s + (a.payment_amount || a.service_price || 0), 0);
    const bank = paidAppts.filter((a) => a.payment_method === 'bank_transfer').reduce((s, a) => s + (a.payment_amount || a.service_price || 0), 0);
    const other = totalRevenue - chapa - bank;
    return { chapa, bank, other };
  }, [paidAppts, totalRevenue]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-white font-black text-2xl">💰 Revenue</h1>
        <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 px-2.5 py-1 rounded-full">
          <span className={`w-1.5 h-1.5 rounded-full ${isFetching ? 'bg-barber-400 animate-ping' : 'bg-green-400 animate-pulse'}`} />
          <span className="text-green-400 text-xs font-semibold tracking-widest">LIVE</span>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              period === p.key
                ? 'bg-barber-500 text-dark-900 border-barber-500'
                : 'text-gray-400 border-dark-600 hover:text-white hover:border-dark-500'
            }`}
          >
            {p.label}
          </button>
        ))}
        {period === 'range' && (
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              className="bg-dark-700 border border-dark-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-barber-500"
            />
            <span className="text-gray-500 text-sm">to</span>
            <input
              type="date"
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
              className="bg-dark-700 border border-dark-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-barber-500"
            />
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-barber-500/10 border border-barber-500/30 rounded-2xl p-5">
          <div className="text-2xl mb-2">💰</div>
          <div className="text-white font-black text-2xl">{currencySymbol} {totalRevenue.toLocaleString()}</div>
          <div className="text-gray-400 text-sm mt-1">Total Revenue (Paid)</div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5">
          <div className="text-2xl mb-2">⏳</div>
          <div className="text-white font-black text-2xl">{currencySymbol} {pendingRevenue.toLocaleString()}</div>
          <div className="text-gray-400 text-sm mt-1">Pending / Unpaid</div>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5">
          <div className="text-2xl mb-2">✅</div>
          <div className="text-white font-black text-2xl">{paidAppts.length}</div>
          <div className="text-gray-400 text-sm mt-1">Paid Appointments</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5">
          <div className="text-2xl mb-2">📅</div>
          <div className="text-white font-black text-2xl">{inRange.length}</div>
          <div className="text-gray-400 text-sm mt-1">Total Appointments</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Bar chart */}
        {byDate.length > 0 && (
          <div className="lg:col-span-2 bg-dark-700 rounded-2xl border border-dark-600 p-5">
            <h2 className="text-white font-bold mb-4">Revenue by Day</h2>
            <div className="flex items-end gap-2 h-40 overflow-x-auto pb-2">
              {byDate.map(([date, amount]) => (
                <div key={date} className="flex flex-col items-center gap-1 min-w-[40px] flex-1">
                  <div className="text-barber-400 text-xs font-bold whitespace-nowrap">
                    {currencySymbol}{amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount}
                  </div>
                  <div
                    className="w-full bg-barber-500 rounded-t-lg min-h-[4px] transition-all"
                    style={{ height: `${Math.max(4, (amount / maxBar) * 120)}px` }}
                  />
                  <div className="text-gray-500 text-xs">{date.slice(5)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment method breakdown */}
        <div className="bg-dark-700 rounded-2xl border border-dark-600 p-5">
          <h2 className="text-white font-bold mb-4">By Payment Method</h2>
          <div className="space-y-3">
            {[
              { label: '💳 Chapa (Online)', amount: paymentMethodBreakdown.chapa, color: 'bg-purple-500' },
              { label: '🏦 Bank Transfer', amount: paymentMethodBreakdown.bank, color: 'bg-blue-500' },
              { label: '💵 Other', amount: paymentMethodBreakdown.other, color: 'bg-gray-500' },
            ].filter((x) => x.amount > 0).map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">{item.label}</span>
                  <span className="text-white font-semibold">{currencySymbol} {item.amount.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all`}
                    style={{ width: `${totalRevenue ? (item.amount / totalRevenue) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
            {totalRevenue === 0 && <div className="text-gray-500 text-sm text-center py-4">No paid revenue in this period</div>}
          </div>
        </div>
      </div>

      {/* Paid appointments list */}
      {paidAppts.length > 0 && (
        <div className="bg-dark-700 rounded-2xl border border-dark-600 overflow-hidden">
          <div className="p-5 border-b border-dark-600">
            <h2 className="text-white font-bold">Paid Appointments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-dark-600 bg-dark-800">
                  {['#', 'Customer', 'Service', 'Barber', 'Date', 'Method', 'Amount'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-600">
                {paidAppts.sort((a, b) => b.appointment_date.localeCompare(a.appointment_date)).map((appt) => (
                  <tr key={appt.id} className="hover:bg-dark-600/30 transition-colors">
                    <td className="px-4 py-3 text-barber-400 font-bold">#{appt.queue_number}</td>
                    <td className="px-4 py-3">
                      <div className="text-white text-sm font-medium">{appt.customer_name}</div>
                      <div className="text-gray-500 text-xs">{appt.customer_phone}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">{appt.service_name}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm whitespace-nowrap">{appt.barber_name || <span className="text-gray-600">Any</span>}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm whitespace-nowrap">{appt.appointment_date}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {appt.payment_method === 'bank_transfer'
                        ? <span className="text-blue-400">🏦 Bank</span>
                        : appt.payment_method === 'chapa'
                        ? <span className="text-purple-400">💳 Chapa</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-green-400 font-bold text-sm whitespace-nowrap">
                      {currencySymbol} {appt.payment_amount || appt.service_price || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-dark-600 bg-dark-800">
                  <td colSpan={6} className="px-4 py-3 text-gray-400 text-sm font-semibold text-right">Total</td>
                  <td className="px-4 py-3 text-barber-400 font-black text-sm">{currencySymbol} {totalRevenue.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {paidAppts.length === 0 && !isFetching && (
        <div className="text-center py-16 text-gray-500">No paid appointments in this period</div>
      )}
    </div>
  );
}
