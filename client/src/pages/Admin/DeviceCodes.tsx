import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';

interface DeviceCode {
  id: string;
  code: string;
  label: string;
  max_uses: number;
  use_count: number;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

interface DeviceVerification {
  device_id: string;
  code: string;
  verified_at: string;
}

export default function DeviceCodes() {
  const qc = useQueryClient();
  const [label, setLabel] = useState('');
  const [maxUses, setMaxUses] = useState('1');
  const [tab, setTab] = useState<'codes' | 'devices'>('codes');

  const { data: codes = [], isLoading } = useQuery<DeviceCode[]>({
    queryKey: ['device-codes'],
    queryFn: () => api.get('/device/codes').then((r) => r.data),
  });

  const { data: verifications = [] } = useQuery<DeviceVerification[]>({
    queryKey: ['device-verifications'],
    queryFn: () => api.get('/device/verifications').then((r) => r.data),
    enabled: tab === 'devices',
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post('/device/codes', { label, max_uses: Number(maxUses) }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['device-codes'] });
      setLabel('');
      setMaxUses('1');
      toast.success('Device code generated');
    },
    onError: () => toast.error('Failed to generate code'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/device/codes/${id}`, { is_active }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['device-codes'] }),
    onError: () => toast.error('Failed to update code'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/device/codes/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['device-codes'] });
      toast.success('Code deleted');
    },
    onError: () => toast.error('Failed to delete code'),
  });

  const revokeDeviceMutation = useMutation({
    mutationFn: (device_id: string) => api.delete(`/device/verifications/${device_id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['device-verifications'] });
      toast.success('Device revoked — it will need to re-verify on next launch');
    },
    onError: () => toast.error('Failed to revoke device'),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => toast.success(`Code ${code} copied!`));
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Device Verification</h1>
        <p className="text-gray-400 text-sm mt-1">Generate codes for new devices and manage verified devices.</p>
      </div>

      {/* Generate new code */}
      <div className="bg-dark-800 border border-dark-600 rounded-2xl p-5">
        <h2 className="text-white font-bold mb-4">Generate New Code</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. Reception Phone)"
            className="flex-1 bg-dark-700 border border-dark-500 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-barber-500"
          />
          <select
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            className="bg-dark-700 border border-dark-500 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-barber-500"
          >
            <option value="1">1 use</option>
            <option value="3">3 uses</option>
            <option value="5">5 uses</option>
            <option value="10">10 uses</option>
            <option value="0">Unlimited</option>
          </select>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="bg-barber-500 hover:bg-barber-400 disabled:opacity-50 text-dark-900 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap"
          >
            {generateMutation.isPending ? 'Generating…' : '+ Generate Code'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['codes', 'devices'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === t ? 'bg-barber-500/20 text-barber-400 border border-barber-500/30' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'codes' ? `Codes (${codes.length})` : `Verified Devices (${verifications.length})`}
          </button>
        ))}
      </div>

      {/* Codes list */}
      {tab === 'codes' && (
        <div className="bg-dark-800 border border-dark-600 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading…</div>
          ) : codes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-3">🔑</div>
              <p>No codes yet. Generate one above.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-600 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Label</th>
                  <th className="px-4 py-3 text-center">Uses</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} className="border-b border-dark-700 last:border-0 hover:bg-dark-700/50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => copyCode(c.code)}
                        title="Click to copy"
                        className="font-mono text-lg font-black text-barber-400 hover:text-barber-300 tracking-widest transition-colors"
                      >
                        {c.code}
                      </button>
                      <div className="text-gray-600 text-xs mt-0.5">{fmtDate(c.created_at)}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{c.label || <span className="text-gray-600">—</span>}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${c.use_count >= c.max_uses && c.max_uses > 0 ? 'text-red-400' : 'text-white'}`}>
                        {c.use_count}
                      </span>
                      <span className="text-gray-500"> / {c.max_uses === 0 ? '∞' : c.max_uses}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleMutation.mutate({ id: c.id, is_active: !c.is_active })}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                          c.is_active
                            ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30'
                        }`}
                      >
                        {c.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => copyCode(c.code)}
                          className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-dark-600 transition-colors"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete code ${c.code}?`)) deleteMutation.mutate(c.id);
                          }}
                          className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Verified devices list */}
      {tab === 'devices' && (
        <div className="bg-dark-800 border border-dark-600 rounded-2xl overflow-hidden">
          {verifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-3">📱</div>
              <p>No devices verified yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-600 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Device ID</th>
                  <th className="px-4 py-3 text-left">Code Used</th>
                  <th className="px-4 py-3 text-left">Verified At</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {verifications.map((v) => (
                  <tr key={v.device_id} className="border-b border-dark-700 last:border-0 hover:bg-dark-700/50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400 max-w-[160px] truncate">{v.device_id}</td>
                    <td className="px-4 py-3 font-mono font-bold text-barber-400 tracking-widest">{v.code}</td>
                    <td className="px-4 py-3 text-gray-400">{fmtDate(v.verified_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm('Revoke this device? It will need to re-verify on next launch.')) {
                            revokeDeviceMutation.mutate(v.device_id);
                          }
                        }}
                        className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
