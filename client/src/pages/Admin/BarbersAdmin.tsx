import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { barbersApi } from '../../lib/api';
import { Barber } from '../../lib/types';

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const EMPTY: Partial<Barber> = {
  name: '', name_am: '', name_om: '',
  phone: '', specialty: '', specialty_am: '', specialty_om: '', avatar: '',
};

interface UnavailRecord { id: string; barber_id: string; date: string; reason: string | null }

function UnavailPanel({ barber }: { barber: Barber }) {
  const qc = useQueryClient();
  const [dateInput, setDateInput] = useState(localDateStr());
  const [reason, setReason] = useState('');
  const [open, setOpen] = useState(false);

  const { data: dates = [] } = useQuery<UnavailRecord[]>({
    queryKey: ['barber-unavailable', barber.id],
    queryFn: () => barbersApi.getUnavailableDates(barber.id),
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: () => barbersApi.setUnavailable(barber.id, dateInput, reason || undefined),
    onSuccess: () => {
      toast.success(`${barber.name} marked unavailable on ${dateInput}`);
      qc.invalidateQueries({ queryKey: ['barber-unavailable', barber.id] });
      setReason('');
    },
    onError: () => toast.error('Failed to set unavailability'),
  });

  const removeMutation = useMutation({
    mutationFn: (date: string) => barbersApi.removeUnavailable(barber.id, date),
    onSuccess: () => {
      toast.success('Availability restored');
      qc.invalidateQueries({ queryKey: ['barber-unavailable', barber.id] });
    },
    onError: () => toast.error('Failed to remove'),
  });

  const alreadySet = dates.some((d) => d.date === dateInput);

  return (
    <div className="mt-3 border-t border-dark-600 pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-sm text-gray-400 hover:text-white transition-colors py-1"
      >
        <span className="flex items-center gap-2">
          🚫 <span>Unavailable Dates</span>
          {dates.length > 0 && (
            <span className="bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 rounded-full border border-red-500/30">
              {dates.length}
            </span>
          )}
        </span>
        <span className="text-gray-600">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* Quick "Today" button + date picker */}
          <div className="flex gap-2">
            <button
              onClick={() => setDateInput(localDateStr())}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                dateInput === localDateStr()
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'bg-dark-600 border-dark-500 text-gray-400 hover:border-red-500/40 hover:text-red-400'
              }`}
            >
              Today
            </button>
            <input
              type="date"
              value={dateInput}
              min={localDateStr()}
              onChange={(e) => setDateInput(e.target.value)}
              className="flex-1 bg-dark-600 border border-dark-500 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-red-500/60"
            />
          </div>

          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional, e.g. sick leave)"
            className="w-full bg-dark-600 border border-dark-500 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-red-500/60 placeholder-gray-600"
          />

          <button
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending || alreadySet || !dateInput}
            className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
              alreadySet
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-red-600/70 hover:bg-red-600 text-white'
            }`}
          >
            {alreadySet ? '✓ Already marked unavailable' : addMutation.isPending ? 'Saving…' : '🚫 Mark Unavailable'}
          </button>

          {/* List of upcoming unavailable dates */}
          {dates.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {dates.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2"
                >
                  <div>
                    <span className="text-red-400 text-xs font-semibold">{rec.date}</span>
                    {rec.reason && <span className="text-gray-500 text-xs ml-2">— {rec.reason}</span>}
                  </div>
                  <button
                    onClick={() => removeMutation.mutate(rec.date)}
                    disabled={removeMutation.isPending}
                    className="text-gray-600 hover:text-green-400 text-xs transition-colors ml-2"
                    title="Restore availability"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BarbersAdmin() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Barber> | null>(null);

  const { data: barbers = [] } = useQuery<Barber[]>({ queryKey: ['barbers'], queryFn: barbersApi.getAll });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Barber>) =>
      data.id ? barbersApi.update(data.id, data) : barbersApi.create(data),
    onSuccess: () => { toast.success('Saved!'); qc.invalidateQueries({ queryKey: ['barbers'] }); setEditing(null); },
    onError: () => toast.error(t('common.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => barbersApi.delete(id),
    onSuccess: () => { toast.success('Removed'); qc.invalidateQueries({ queryKey: ['barbers'] }); },
    onError: () => toast.error(t('common.error')),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white font-black text-2xl">{t('admin.barbers')}</h1>
        <button
          onClick={() => setEditing(EMPTY)}
          className="bg-barber-500 hover:bg-barber-400 text-dark-900 font-bold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + {t('admin.add')}
        </button>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-700 rounded-2xl border border-dark-600 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-white font-bold text-xl mb-5">
              {editing.id ? t('admin.edit') : t('admin.add')} {t('admin.barbers')}
            </h2>
            <div className="space-y-3">
              {[
                { key: 'name', label: `${t('admin.name')} (EN)`, required: true },
                { key: 'name_am', label: `${t('admin.name')} (አማርኛ)` },
                { key: 'name_om', label: `${t('admin.name')} (Afaan Oromoo)` },
                { key: 'phone', label: t('admin.phone') },
                { key: 'specialty', label: `${t('admin.specialty')} (EN)` },
                { key: 'specialty_am', label: `${t('admin.specialty')} (አማርኛ)` },
                { key: 'specialty_om', label: `${t('admin.specialty')} (Afaan Oromoo)` },
                { key: 'avatar', label: 'Avatar URL' },
              ].map(({ key, label, required }) => (
                <div key={key}>
                  <label className="block text-gray-400 text-xs mb-1">{label}</label>
                  <input
                    type="text"
                    value={(editing as any)[key] || ''}
                    onChange={(e) => setEditing((p) => ({ ...p, [key]: e.target.value }))}
                    required={required}
                    className="w-full bg-dark-600 border border-dark-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-barber-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="flex-1 bg-dark-600 text-gray-300 font-medium py-2.5 rounded-xl">
                {t('admin.cancel')}
              </button>
              <button
                onClick={() => saveMutation.mutate(editing)}
                disabled={saveMutation.isPending || !editing.name}
                className="flex-1 bg-barber-500 hover:bg-barber-400 disabled:opacity-50 text-dark-900 font-bold py-2.5 rounded-xl"
              >
                {saveMutation.isPending ? t('common.loading') : t('admin.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barber cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {barbers.map((barber) => (
          <div key={barber.id} className="bg-dark-700 rounded-2xl border border-dark-600 p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-dark-600 border-2 border-barber-500/30 shrink-0">
                {barber.avatar ? (
                  <img src={barber.avatar} alt={barber.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">✂️</div>
                )}
              </div>
              <div>
                <h3 className="text-white font-bold">{barber.name}</h3>
                {barber.name_am && <p className="text-gray-500 text-xs font-amharic">{barber.name_am}</p>}
                {barber.specialty && <p className="text-barber-400 text-sm">{barber.specialty}</p>}
              </div>
            </div>
            {barber.phone && <p className="text-gray-500 text-sm mb-4">📱 {barber.phone}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(barber)}
                className="flex-1 bg-dark-600 hover:bg-dark-500 text-gray-300 text-sm py-2 rounded-lg transition-colors"
              >
                ✏️ {t('admin.edit')}
              </button>
              <button
                onClick={() => { if (confirm('Remove barber?')) deleteMutation.mutate(barber.id); }}
                className="bg-red-900/40 hover:bg-red-900 text-red-400 text-sm px-3 py-2 rounded-lg transition-colors"
              >
                🗑
              </button>
            </div>

            {/* Unavailability section */}
            <UnavailPanel barber={barber} />
          </div>
        ))}
      </div>
    </div>
  );
}
