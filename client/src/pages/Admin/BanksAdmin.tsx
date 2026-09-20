import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { banksApi } from '../../lib/api';
import { BankAccount } from '../../lib/types';

const EMPTY: Partial<BankAccount> = {
  bank_name: '', account_number: '', account_name: '', logo_emoji: '🏦', instructions: '',
};

export default function BanksAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<BankAccount> | null>(null);

  const { data: banks = [] } = useQuery<BankAccount[]>({
    queryKey: ['banks'],
    queryFn: banksApi.getAll,
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<BankAccount>) =>
      data.id ? banksApi.update(data.id, data) : banksApi.create(data),
    onSuccess: () => { toast.success('Saved!'); qc.invalidateQueries({ queryKey: ['banks'] }); setEditing(null); },
    onError: () => toast.error('Failed to save bank account'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => banksApi.delete(id),
    onSuccess: () => { toast.success('Removed'); qc.invalidateQueries({ queryKey: ['banks'] }); },
    onError: () => toast.error('Failed to remove'),
  });

  const canSave = !!(editing?.bank_name && editing?.account_number && editing?.account_name);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-black text-2xl">Bank Transfer Accounts</h1>
          <p className="text-gray-500 text-sm mt-1">Customers will see these options when paying by bank transfer</p>
        </div>
        <button
          onClick={() => setEditing(EMPTY)}
          className="bg-barber-500 hover:bg-barber-400 text-dark-900 font-bold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Add Bank
        </button>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-700 rounded-2xl border border-dark-600 p-6 w-full max-w-lg">
            <h2 className="text-white font-bold text-xl mb-5">
              {editing.id ? 'Edit Bank Account' : 'Add Bank Account'}
            </h2>
            <div className="space-y-3">
              {[
                { key: 'bank_name', label: 'Bank Name', placeholder: 'e.g. Commercial Bank of Ethiopia', required: true },
                { key: 'account_number', label: 'Account Number', placeholder: 'e.g. 1000123456789', required: true },
                { key: 'account_name', label: 'Account Holder Name', placeholder: 'e.g. Abebe Barbershop', required: true },
                { key: 'logo_emoji', label: 'Emoji Icon', placeholder: '🏦' },
                { key: 'instructions', label: 'Transfer Instructions (optional)', placeholder: 'e.g. Use appointment ID as reference' },
              ].map(({ key, label, placeholder, required }) => (
                <div key={key}>
                  <label className="block text-gray-400 text-xs mb-1">{label}</label>
                  <input
                    type="text"
                    value={(editing as any)[key] || ''}
                    onChange={(e) => setEditing((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    required={required}
                    className="w-full bg-dark-600 border border-dark-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-barber-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="flex-1 bg-dark-600 text-gray-300 font-medium py-2.5 rounded-xl">
                Cancel
              </button>
              <button
                onClick={() => saveMutation.mutate(editing)}
                disabled={saveMutation.isPending || !canSave}
                className="flex-1 bg-barber-500 hover:bg-barber-400 disabled:opacity-50 text-dark-900 font-bold py-2.5 rounded-xl"
              >
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {banks.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">🏦</div>
          <p className="text-lg font-medium text-gray-400">No bank accounts yet</p>
          <p className="text-sm mt-1">Add bank accounts so customers can pay by transfer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map((bank) => (
            <div key={bank.id} className="bg-dark-700 rounded-2xl border border-dark-600 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-barber-500/20 border border-barber-500/30 rounded-xl flex items-center justify-center text-2xl">
                  {bank.logo_emoji || '🏦'}
                </div>
                <div>
                  <h3 className="text-white font-bold">{bank.bank_name}</h3>
                  <p className="text-gray-500 text-xs">{bank.account_name}</p>
                </div>
              </div>
              <div className="bg-dark-600 rounded-xl p-3 mb-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Account No.</span>
                  <span className="text-white font-mono font-semibold">{bank.account_number}</span>
                </div>
                {bank.instructions && (
                  <p className="text-gray-500 text-xs pt-1 border-t border-dark-500">{bank.instructions}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(bank)}
                  className="flex-1 bg-dark-600 hover:bg-dark-500 text-gray-300 text-sm py-2 rounded-lg transition-colors"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => { if (confirm('Remove this bank account?')) deleteMutation.mutate(bank.id); }}
                  className="bg-red-900/40 hover:bg-red-900 text-red-400 text-sm px-3 py-2 rounded-lg transition-colors"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
