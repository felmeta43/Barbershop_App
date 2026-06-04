import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { barbersApi } from '../../lib/api';
import { Barber } from '../../lib/types';

const EMPTY: Partial<Barber> = {
  name: '', name_am: '', name_om: '',
  phone: '', specialty: '', specialty_am: '', specialty_om: '', avatar: '',
};

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
              <button
                onClick={() => setEditing(null)}
                className="flex-1 bg-dark-600 text-gray-300 font-medium py-2.5 rounded-xl"
              >
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
          </div>
        ))}
      </div>
    </div>
  );
}
