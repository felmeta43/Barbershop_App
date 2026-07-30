import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi } from '../../lib/api';
import { ShopSettings } from '../../lib/types';
import { useShop } from '../../context/ShopContext';
import { applyTheme } from '../../context/ShopContext';

const TABS = ['identity', 'contact', 'hours', 'appearance', 'social', 'booking'] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  identity: '🏪 Identity',
  contact: '📞 Contact',
  hours: '🕐 Hours',
  appearance: '🎨 Appearance',
  social: '📱 Social',
  booking: '📅 Booking',
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const COLOR_PRESETS = [
  { key: 'gold',   label: 'Gold',   hex: '#e89b00' },
  { key: 'blue',   label: 'Blue',   hex: '#3b82f6' },
  { key: 'green',  label: 'Green',  hex: '#22c55e' },
  { key: 'red',    label: 'Red',    hex: '#ef4444' },
  { key: 'purple', label: 'Purple', hex: '#a855f7' },
  { key: 'teal',   label: 'Teal',   hex: '#14b8a6' },
  { key: 'orange', label: 'Orange', hex: '#f97316' },
  { key: 'pink',   label: 'Pink',   hex: '#ec4899' },
];

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-gray-400 text-sm mb-1">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, multiline }: {
  value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean;
}) {
  const cls = 'w-full bg-dark-600 border border-dark-500 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-barber-500';
  if (multiline) {
    return (
      <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} className={cls + ' resize-none'} />
    );
  }
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} className={cls} />
  );
}

export default function ShopSettingsPage() {
  const { shop } = useShop();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('identity');
  const [form, setForm] = useState<Partial<ShopSettings>>({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (shop && !initialized) {
      setForm(shop);
      setInitialized(true);
    }
  }, [shop, initialized]);

  const set = (key: keyof ShopSettings, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const setHour = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setForm((f) => ({
      ...f,
      working_hours: {
        ...(f.working_hours as any),
        [day]: { ...(f.working_hours as any)?.[day], [field]: value },
      },
    }));
  };

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.update(form),
    onSuccess: (updated) => {
      qc.setQueryData(['shop-settings'], updated);
      applyTheme(updated.theme_preset || 'gold', updated.theme_color);
      toast.success('Settings saved!');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const wh = form.working_hours as any;

  if (!shop) {
    return <div className="text-gray-400 text-center py-20">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Shop Settings</h1>
          <p className="text-gray-400 text-sm mt-1">Customize your barbershop for any owner</p>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-barber-500 hover:bg-barber-400 disabled:opacity-50 text-dark-900 font-bold px-6 py-2.5 rounded-xl transition-colors"
        >
          {saveMutation.isPending ? 'Saving...' : '💾 Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-barber-500/20 text-barber-400 border border-barber-500/40'
                : 'text-gray-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className="bg-dark-700 rounded-2xl p-6 border border-dark-600">
        {/* Identity */}
        {activeTab === 'identity' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-white font-bold text-lg">Shop Identity</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FieldGroup label="Shop Name (English)">
                <TextInput value={form.name || ''} onChange={(v) => set('name', v)} placeholder="My Barbershop" />
              </FieldGroup>
              <FieldGroup label="Shop Name (አማርኛ)">
                <TextInput value={form.name_am || ''} onChange={(v) => set('name_am', v)} />
              </FieldGroup>
              <FieldGroup label="Shop Name (Afaan Oromo)">
                <TextInput value={form.name_om || ''} onChange={(v) => set('name_om', v)} />
              </FieldGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FieldGroup label="Tagline (English)">
                <TextInput value={form.tagline || ''} onChange={(v) => set('tagline', v)} placeholder="Premium Cuts & Grooming" />
              </FieldGroup>
              <FieldGroup label="Tagline (አማርኛ)">
                <TextInput value={form.tagline_am || ''} onChange={(v) => set('tagline_am', v)} />
              </FieldGroup>
              <FieldGroup label="Tagline (Afaan Oromo)">
                <TextInput value={form.tagline_om || ''} onChange={(v) => set('tagline_om', v)} />
              </FieldGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FieldGroup label="About (English)">
                <TextInput value={form.about || ''} onChange={(v) => set('about', v)} multiline />
              </FieldGroup>
              <FieldGroup label="About (አማርኛ)">
                <TextInput value={form.about_am || ''} onChange={(v) => set('about_am', v)} multiline />
              </FieldGroup>
              <FieldGroup label="About (Afaan Oromo)">
                <TextInput value={form.about_om || ''} onChange={(v) => set('about_om', v)} multiline />
              </FieldGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FieldGroup label="Logo Emoji">
                <TextInput value={form.logo_emoji || ''} onChange={(v) => set('logo_emoji', v)} placeholder="✂" />
              </FieldGroup>
              <FieldGroup label="Logo Image URL (optional)">
                <TextInput value={form.logo_url || ''} onChange={(v) => set('logo_url', v)} placeholder="https://..." />
              </FieldGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldGroup label="Happy Clients Stat">
                <TextInput value={form.stats_clients || ''} onChange={(v) => set('stats_clients', v)} placeholder="500+" />
              </FieldGroup>
              <FieldGroup label="Years in Business">
                <TextInput value={form.stats_years || ''} onChange={(v) => set('stats_years', v)} placeholder="5+" />
              </FieldGroup>
            </div>
          </div>
        )}

        {/* Contact */}
        {activeTab === 'contact' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-white font-bold text-lg">Contact Info</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldGroup label="Phone">
                <TextInput value={form.phone || ''} onChange={(v) => set('phone', v)} placeholder="+251 911 000 000" />
              </FieldGroup>
              <FieldGroup label="Email">
                <TextInput value={form.email || ''} onChange={(v) => set('email', v)} placeholder="info@shop.com" />
              </FieldGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FieldGroup label="Address (English)">
                <TextInput value={form.address || ''} onChange={(v) => set('address', v)} placeholder="City, Country" />
              </FieldGroup>
              <FieldGroup label="Address (አማርኛ)">
                <TextInput value={form.address_am || ''} onChange={(v) => set('address_am', v)} />
              </FieldGroup>
              <FieldGroup label="Address (Afaan Oromo)">
                <TextInput value={form.address_om || ''} onChange={(v) => set('address_om', v)} />
              </FieldGroup>
            </div>
          </div>
        )}

        {/* Hours */}
        {activeTab === 'hours' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-white font-bold text-lg">Working Hours</h2>
            <div className="space-y-3">
              {DAYS.map((day) => {
                const h = wh?.[day] || { open: '08:00', close: '18:00', closed: false };
                return (
                  <div key={day} className="flex items-center gap-4 py-3 border-b border-dark-600">
                    <div className="w-28 text-gray-300 font-medium capitalize">{day}</div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!h.closed}
                        onChange={(e) => setHour(day, 'closed', e.target.checked)}
                        className="w-4 h-4 accent-red-500"
                      />
                      <span className="text-sm text-gray-400">Closed</span>
                    </label>
                    {!h.closed && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-sm">Open</span>
                          <input
                            type="time"
                            value={h.open}
                            onChange={(e) => setHour(day, 'open', e.target.value)}
                            className="bg-dark-600 border border-dark-500 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-barber-500"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-sm">Close</span>
                          <input
                            type="time"
                            value={h.close}
                            onChange={(e) => setHour(day, 'close', e.target.value)}
                            className="bg-dark-600 border border-dark-500 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-barber-500"
                          />
                        </div>
                      </>
                    )}
                    {h.closed && <span className="text-red-400 text-sm">Closed all day</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Appearance */}
        {activeTab === 'appearance' && (
          <div className="space-y-8 animate-fade-in">
            <h2 className="text-white font-bold text-lg">Color Theme</h2>

            <div>
              <p className="text-gray-400 text-sm mb-4">Choose a preset color:</p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => {
                      set('theme_preset', preset.key);
                      set('theme_color', preset.hex);
                      applyTheme(preset.key);
                    }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      form.theme_preset === preset.key
                        ? 'border-white/50 bg-dark-600'
                        : 'border-dark-500 hover:border-dark-400'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full" style={{ backgroundColor: preset.hex }} />
                    <span className="text-gray-400 text-xs">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-gray-400 text-sm mb-4">Or pick a custom color:</p>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={form.theme_color || '#e89b00'}
                  onChange={(e) => {
                    set('theme_preset', 'custom');
                    set('theme_color', e.target.value);
                    applyTheme('custom', e.target.value);
                  }}
                  className="w-12 h-12 rounded-xl border border-dark-500 cursor-pointer bg-transparent"
                />
                <div>
                  <div className="text-white font-medium">{form.theme_color || '#e89b00'}</div>
                  <div className="text-gray-500 text-sm">Hex color</div>
                </div>
                <div className="flex-1 h-12 rounded-xl bg-barber-500 border border-barber-600 flex items-center justify-center">
                  <span className="text-dark-900 font-bold text-sm">Preview</span>
                </div>
              </div>
            </div>

            <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
              <p className="text-gray-400 text-xs mb-3">Live preview — all buttons and accents use your chosen color:</p>
              <div className="flex gap-3 flex-wrap">
                <button className="bg-barber-500 text-dark-900 font-bold px-4 py-2 rounded-lg text-sm">Primary Button</button>
                <button className="bg-barber-500/20 text-barber-400 font-semibold px-4 py-2 rounded-lg text-sm border border-barber-500/30">Secondary</button>
                <span className="text-barber-400 font-medium text-sm self-center">Link text</span>
                <div className="h-2 bg-barber-500 rounded-full w-24 self-center" />
              </div>
            </div>
          </div>
        )}

        {/* Social */}
        {activeTab === 'social' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-white font-bold text-lg">Social Media Links</h2>
            <p className="text-gray-500 text-sm">Leave blank to hide the link on your site.</p>
            {[
              { key: 'facebook', label: 'Facebook URL', placeholder: 'https://facebook.com/yourshop' },
              { key: 'instagram', label: 'Instagram URL', placeholder: 'https://instagram.com/yourshop' },
              { key: 'telegram', label: 'Telegram URL / Username', placeholder: 'https://t.me/yourshop' },
              { key: 'tiktok', label: 'TikTok URL', placeholder: 'https://tiktok.com/@yourshop' },
              { key: 'twitter', label: 'X / Twitter URL', placeholder: 'https://x.com/yourshop' },
            ].map(({ key, label, placeholder }) => (
              <FieldGroup key={key} label={label}>
                <TextInput
                  value={(form as any)[key] || ''}
                  onChange={(v) => set(key as keyof ShopSettings, v)}
                  placeholder={placeholder}
                />
              </FieldGroup>
            ))}
          </div>
        )}

        {/* Booking */}
        {activeTab === 'booking' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-white font-bold text-lg">Booking Settings</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldGroup label="Currency Code (e.g. ETB, USD)">
                <TextInput value={form.currency || ''} onChange={(v) => set('currency', v)} placeholder="ETB" />
              </FieldGroup>
              <FieldGroup label="Currency Symbol (shown to users)">
                <TextInput value={form.currency_symbol || ''} onChange={(v) => set('currency_symbol', v)} placeholder="ETB" />
              </FieldGroup>
            </div>

            <FieldGroup label="Max Days Ahead Customers Can Book">
              <input
                type="number"
                min={1}
                max={90}
                value={form.advance_booking_days || 14}
                onChange={(e) => set('advance_booking_days', Number(e.target.value))}
                className="w-full bg-dark-600 border border-dark-500 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-barber-500"
              />
            </FieldGroup>

            <FieldGroup label="Appointment Slot Duration (minutes)">
              <select
                value={form.slot_duration_minutes || 30}
                onChange={(e) => set('slot_duration_minutes', Number(e.target.value))}
                className="w-full bg-dark-600 border border-dark-500 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-barber-500"
              >
                {[15, 20, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>{m} minutes</option>
                ))}
              </select>
            </FieldGroup>
          </div>
        )}
      </div>

      {/* Floating save */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-barber-500 hover:bg-barber-400 disabled:opacity-50 text-dark-900 font-bold px-8 py-3 rounded-xl transition-colors"
        >
          {saveMutation.isPending ? 'Saving...' : '💾 Save All Changes'}
        </button>
      </div>
    </div>
  );
}
