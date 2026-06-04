import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { servicesApi } from '../../lib/api';
import { Service } from '../../lib/types';

const EMPTY: Partial<Service> = {
  name: '', name_am: '', name_om: '',
  description: '', description_am: '', description_om: '',
  price: 0, duration_minutes: 30, category: 'haircut',
};

export default function ServicesAdmin() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Service> | null>(null);

  const { data: services = [] } = useQuery<Service[]>({ queryKey: ['services'], queryFn: servicesApi.getAll });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Service>) =>
      data.id ? servicesApi.update(data.id, data) : servicesApi.create(data),
    onSuccess: () => {
      toast.success('Saved!');
      qc.invalidateQueries({ queryKey: ['services'] });
      setEditing(null);
    },
    onError: () => toast.error(t('common.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => servicesApi.delete(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['services'] }); },
    onError: () => toast.error(t('common.error')),
  });

  const categoryColors: Record<string, string> = {
    haircut: 'text-blue-400', beard: 'text-green-400',
    combo: 'text-purple-400', kids: 'text-pink-400', styling: 'text-orange-400',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white font-black text-2xl">{t('admin.services')}</h1>
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
              {editing.id ? t('admin.edit') : t('admin.add')} {t('admin.services')}
            </h2>
            <div className="space-y-3">
              {[
                { key: 'name', label: `${t('admin.name')} (EN)`, required: true },
                { key: 'name_am', label: `${t('admin.name')} (አማርኛ)` },
                { key: 'name_om', label: `${t('admin.name')} (Afaan Oromoo)` },
                { key: 'description', label: 'Description (EN)' },
                { key: 'description_am', label: 'Description (አማርኛ)' },
                { key: 'description_om', label: 'Description (Afaan Oromoo)' },
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">{t('admin.price')}</label>
                  <input
                    type="number"
                    value={editing.price || ''}
                    onChange={(e) => setEditing((p) => ({ ...p, price: parseFloat(e.target.value) }))}
                    className="w-full bg-dark-600 border border-dark-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-barber-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">{t('admin.duration')}</label>
                  <input
                    type="number"
                    value={editing.duration_minutes || ''}
                    onChange={(e) => setEditing((p) => ({ ...p, duration_minutes: parseInt(e.target.value) }))}
                    className="w-full bg-dark-600 border border-dark-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-barber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">{t('admin.category')}</label>
                <select
                  value={editing.category}
                  onChange={(e) => setEditing((p) => ({ ...p, category: e.target.value as any }))}
                  className="w-full bg-dark-600 border border-dark-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-barber-500"
                >
                  {['haircut', 'beard', 'combo', 'kids', 'styling', 'other'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
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

      {/* Services grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <div key={service.id} className="bg-dark-700 rounded-2xl border border-dark-600 p-5">
            <div className="flex justify-between items-start mb-3">
              <span className={`text-xs font-semibold ${categoryColors[service.category] || 'text-gray-400'}`}>
                {service.category}
              </span>
              <span className="text-barber-400 font-black text-xl">{service.price} ETB</span>
            </div>
            <h3 className="text-white font-bold mb-1">{service.name}</h3>
            {service.name_am && <p className="text-gray-500 text-xs font-amharic">{service.name_am}</p>}
            {service.name_om && <p className="text-gray-500 text-xs">{service.name_om}</p>}
            <p className="text-gray-500 text-sm mt-2">⏱ {service.duration_minutes} min</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setEditing(service)}
                className="flex-1 bg-dark-600 hover:bg-dark-500 text-gray-300 text-sm py-2 rounded-lg transition-colors"
              >
                ✏️ {t('admin.edit')}
              </button>
              <button
                onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(service.id); }}
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
