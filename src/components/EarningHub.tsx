import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, Banknote, Clock, CheckCircle2, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Spinner, Button, EmptyState } from './ui';
import { Modal } from './Modal';
import { formatRupiah, type Transaction, type Withdrawal, type Invoice } from '../lib/types';
import { timeAgo } from '../lib/helpers';

export function EarningHub() {
  const { user, profileMahasiswa, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState(profileMahasiswa?.bank_name || '');
  const [bankAccountName, setBankAccountName] = useState(profileMahasiswa?.bank_account_name || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(profileMahasiswa?.bank_account_number || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user) loadData(); }, [user]);

  async function loadData() {
    if (!user) return;
    setLoading(true);
    // Get released transactions (earnings)
    const { data: txs } = await supabase.from('transactions').select('*').eq('mahasiswa_user_id', user.id).eq('status_escrow', 'released').order('released_at', { ascending: false });
    const txList = (txs as Transaction[]) || [];
    setTransactions(txList);
    const total = txList.reduce((a, t) => a + (t.net_to_mahasiswa || 0), 0);
    setTotalEarnings(total);
    // Get withdrawals
    const { data: wds } = await supabase.from('withdrawals').select('*').eq('mahasiswa_user_id', user.id).order('requested_at', { ascending: false });
    const wdList = (wds as Withdrawal[]) || [];
    setWithdrawals(wdList);
    // Balance = total earnings - total withdrawn (processed)
    const withdrawn = wdList.filter((w) => w.status === 'processed' || w.status === 'approved').reduce((a, w) => a + w.amount, 0);
    setBalance(total - withdrawn);
    // Get invoices
    const { data: invs } = await supabase.from('invoices').select('*').eq('mahasiswa_user_id', user.id).order('issued_at', { ascending: false });
    setInvoices((invs as Invoice[]) || []);
    setLoading(false);
  }

  async function requestWithdraw() {
    if (!user || !profileMahasiswa) return;
    setSaving(true);
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) { setSaving(false); alert('Jumlah penarikan tidak valid'); return; }
    if (amt > balance) { setSaving(false); alert('Jumlah melebihi saldo tersedia'); return; }
    if (!bankName.trim() || !bankAccountName.trim() || !bankAccountNumber.trim()) { setSaving(false); alert('Lengkapi data rekening bank'); return; }
    await (supabase.from('withdrawals') as any).insert({ mahasiswa_user_id: user.id, amount: amt, bank_name: bankName, bank_account_name: bankAccountName, bank_account_number: bankAccountNumber });
    await (supabase.from('profiles_mahasiswa') as any).update({ bank_name: bankName, bank_account_name: bankAccountName, bank_account_number: bankAccountNumber }).eq('id', profileMahasiswa.id);
    await refreshProfile();
    setWithdrawAmount(''); setShowWithdraw(false); setSaving(false); loadData();
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size={32} className="text-emerald-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-navy-800">Earning Hub</h2>
        <p className="text-sm text-gray-500">Kelola pendapatan dan penarikan dana Anda</p>
      </div>

      {/* Balance Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><Wallet size={20} /></div>
            <span className="text-xs text-white/70">Saldo Tersedia</span>
          </div>
          <div className="text-2xl font-bold">{formatRupiah(balance)}</div>
          <Button variant="outline" className="mt-3 w-full !bg-white/10 !border-white/30 !text-white hover:!bg-white/20" onClick={() => setShowWithdraw(true)} disabled={balance <= 0}>
            <Banknote size={16} /> Tarik Dana
          </Button>
        </div>
        <div className="card p-5">
          <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center mb-3"><TrendingUp size={20} className="text-navy-600" /></div>
          <div className="text-2xl font-bold text-navy-800">{formatRupiah(totalEarnings)}</div>
          <div className="text-sm text-gray-500 mt-1">Total Pendapatan</div>
        </div>
        <div className="card p-5">
          <div className="w-10 h-10 rounded-xl bg-sunshine-50 flex items-center justify-center mb-3"><Clock size={20} className="text-sunshine-600" /></div>
          <div className="text-2xl font-bold text-navy-800">{withdrawals.filter((w) => w.status === 'pending').length}</div>
          <div className="text-sm text-gray-500 mt-1">Penarikan Pending</div>
        </div>
      </div>

      {/* Transactions */}
      <div className="card p-5">
        <h3 className="font-semibold text-navy-800 mb-4">Riwayat Transaksi</h3>
        {transactions.length === 0 ? <EmptyState icon={<Wallet size={28} />} title="Belum Ada Transaksi" description="Pendapatan akan muncul setelah proyek selesai." /> : (
          <div className="space-y-2">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center"><CheckCircle2 size={18} className="text-emerald-600" /></div>
                  <div><div className="text-sm font-medium text-navy-800">{formatRupiah(t.net_to_mahasiswa)}</div><div className="text-xs text-gray-400">{t.released_at ? timeAgo(t.released_at) : timeAgo(t.created_at)}</div></div>
                </div>
                <span className="badge-emerald text-xs">Diterima</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdrawal History */}
      <div className="card p-5">
        <h3 className="font-semibold text-navy-800 mb-4">Riwayat Penarikan</h3>
        {withdrawals.length === 0 ? <EmptyState icon={<Banknote size={28} />} title="Belum Ada Penarikan" description="Penarikan dana ke rekening bank akan muncul di sini." /> : (
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-navy-100 flex items-center justify-center"><Banknote size={18} className="text-navy-500" /></div>
                  <div>
                    <div className="text-sm font-medium text-navy-800">{formatRupiah(w.amount)}</div>
                    <div className="text-xs text-gray-400">{w.bank_name} · {timeAgo(w.requested_at)}</div>
                  </div>
                </div>
                <span className={`text-xs font-medium capitalize ${w.status === 'processed' ? 'badge-emerald' : w.status === 'pending' ? 'badge-sunshine' : w.status === 'rejected' ? 'badge-red' : 'badge-navy'}`}>{w.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoices */}
      {invoices.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-navy-800 mb-4">Invoice / Proof of Completion</h3>
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-navy-100 flex items-center justify-center"><FileText size={18} className="text-navy-500" /></div>
                  <div><div className="text-sm font-medium text-navy-800">{inv.invoice_number}</div><div className="text-xs text-gray-400">{formatRupiah(inv.net_amount)} · {timeAgo(inv.issued_at)}</div></div>
                </div>
                <span className="badge-emerald text-xs">{inv.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      <Modal open={showWithdraw} onClose={() => setShowWithdraw(false)} title="Tarik Dana" size="sm">
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="text-xs text-gray-500">Saldo Tersedia</div>
            <div className="text-xl font-bold text-emerald-600">{formatRupiah(balance)}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Jumlah Penarikan</label>
            <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="0" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Bank</label>
            <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="BCA / Mandiri / BNI" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Nama Pemilik Rekening</label>
            <input type="text" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} placeholder="Nama sesuai rekening" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Nomor Rekening</label>
            <input type="text" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="1234567890" className="input-field" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowWithdraw(false)}>Batal</Button>
            <Button className="flex-1" loading={saving} onClick={requestWithdraw} disabled={!withdrawAmount || !bankName || !bankAccountName || !bankAccountNumber}>Tarik</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
