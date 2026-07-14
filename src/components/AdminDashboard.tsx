import { useState, useEffect } from 'react';
import {
  Shield, CheckCircle2, XCircle, Clock, Users, AlertTriangle, Wallet, TrendingUp,
  Ban, Send, Power, DollarSign, Search,
  Briefcase, Settings, Banknote, LifeBuoy, MessageSquare, History,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Spinner, Button, EmptyState } from './ui';
import { Modal } from './Modal';
import {
  formatRupiah, type ProfileMahasiswa, type ProfileUmkm, type Transaction,
  type Dispute, type Withdrawal, type PlatformSetting,
  type SupportTicket, type TicketMessage, type AuditLog,
  TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS,
} from '../lib/types';
import { timeAgo, getInitials } from '../lib/helpers';

type AdminTab = 'overview' | 'verification' | 'disputes' | 'finance' | 'users' | 'support' | 'broadcast' | 'audit' | 'settings';

interface BroadcastRecord {
  id: string; admin_id: string; title: string; message: string;
  target_role: string; created_at: string;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [pendingMhs, setPendingMhs] = useState<ProfileMahasiswa[]>([]);
  const [pendingUmkm, setPendingUmkm] = useState<ProfileUmkm[]>([]);
  const [disputes, setDisputes] = useState<(Dispute & { projectTitle: string })[]>([]);
  const [pendingWds, setPendingWds] = useState<Withdrawal[]>([]);
  const [allUsers, setAllUsers] = useState<{ mhs: ProfileMahasiswa[]; umkm: ProfileUmkm[] }>({ mhs: [], umkm: [] });
  const [stats, setStats] = useState({ totalEscrow: 0, totalCommission: 0, totalWithdrawn: 0, totalUsers: 0, totalProjects: 0, openDisputes: 0 });
  const [killSwitch, setKillSwitch] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState({ title: '', message: '', target_role: 'all' as 'all' | 'umkm' | 'mahasiswa' });
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [banReason, setBanReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [tickets, setTickets] = useState<(SupportTicket & { userName: string })[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMsgs, setTicketMsgs] = useState<TicketMessage[]>([]);
  const [ticketReply, setTicketReply] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => { if (user) loadAll(); }, [user]);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadPending(), loadDisputes(), loadWithdrawals(), loadUsers(), loadStats(), loadSettings(), loadTickets(), loadBroadcasts(), loadAuditLogs()]);
    setLoading(false);
  }

  async function loadPending() {
    const { data: mhs } = await supabase.from('profiles_mahasiswa').select('*').eq('status_verif', 'pending').order('created_at', { ascending: false });
    setPendingMhs((mhs as ProfileMahasiswa[]) || []);
    const { data: umkm } = await supabase.from('profiles_umkm').select('*').eq('status_verif', 'pending').order('created_at', { ascending: false });
    setPendingUmkm((umkm as ProfileUmkm[]) || []);
  }

  async function loadDisputes() {
    const { data: disps } = await supabase.from('disputes').select('*').in('status', ['open', 'investigating']).order('created_at', { ascending: false });
    const list: (Dispute & { projectTitle: string })[] = [];
    for (const d of (disps as Dispute[]) || []) {
      const { data: p } = await supabase.from('projects').select('judul').eq('id', d.project_id).maybeSingle();
      list.push({ ...d, projectTitle: (p as { judul: string } | null)?.judul || 'Unknown' });
    }
    setDisputes(list);
  }

  async function loadWithdrawals() {
    const { data: wds } = await supabase.from('withdrawals').select('*').eq('status', 'pending').order('requested_at', { ascending: false });
    setPendingWds((wds as Withdrawal[]) || []);
  }

  async function loadUsers() {
    const { data: mhs } = await supabase.from('profiles_mahasiswa').select('*').order('created_at', { ascending: false });
    const { data: umkm } = await supabase.from('profiles_umkm').select('*').order('created_at', { ascending: false });
    const mhsList = (mhs as ProfileMahasiswa[]) || [];
    const umkmList = (umkm as ProfileUmkm[]) || [];
    setAllUsers({ mhs: mhsList, umkm: umkmList });
    setStats((prev) => ({ ...prev, totalUsers: mhsList.length + umkmList.length }));
  }

  async function loadStats() {
    const { data: txs } = await supabase.from('transactions').select('*');
    const txList = (txs as Transaction[]) || [];
    const escrow = txList.filter((t) => t.status_escrow === 'held').reduce((a, t) => a + t.amount, 0);
    const commission = txList.filter((t) => t.status_escrow === 'released').reduce((a, t) => a + (t.komisi_skillnex || 0), 0);
    const { data: wds } = await supabase.from('withdrawals').select('amount').in('status', ['processed', 'approved']);
    const withdrawn = ((wds as { amount: number }[]) || []).reduce((a, w) => a + w.amount, 0);
    const { count: totalProjects } = await supabase.from('projects').select('*', { count: 'exact', head: true });
    const { count: openDisputes } = await supabase.from('disputes').select('*', { count: 'exact', head: true }).in('status', ['open', 'investigating']);
    setStats((prev) => ({ ...prev, totalEscrow: escrow, totalCommission: commission, totalWithdrawn: withdrawn, totalProjects: totalProjects || 0, openDisputes: openDisputes || 0 }));
  }

  async function loadSettings() {
    const { data: settings } = await supabase.from('platform_settings').select('*').eq('key', 'kill_switch_transactions').maybeSingle();
    setKillSwitch((settings as PlatformSetting | null)?.value === 'true');
  }

  async function loadTickets() {
    const { data: tks } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    const list: (SupportTicket & { userName: string })[] = [];
    for (const t of (tks as SupportTicket[]) || []) {
      let userName = 'User';
      const { data: mhs } = await supabase.from('profiles_mahasiswa').select('nama_lengkap').eq('user_id', t.user_id).maybeSingle();
      if (mhs) userName = (mhs as ProfileMahasiswa).nama_lengkap;
      else { const { data: umkm } = await supabase.from('profiles_umkm').select('nama_umkm').eq('user_id', t.user_id).maybeSingle(); if (umkm) userName = (umkm as ProfileUmkm).nama_umkm; }
      list.push({ ...t, userName });
    }
    setTickets(list);
  }

  async function loadBroadcasts() {
    const { data: bcs } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(20);
    setBroadcasts((bcs as BroadcastRecord[]) || []);
  }

  async function loadAuditLogs() {
    const { data: logs } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50);
    setAuditLogs((logs as AuditLog[]) || []);
  }

  async function verifyUser(userId: string, type: 'mhs' | 'umkm', approve: boolean, reason?: string) {
    setSaving(true);
    const table = type === 'mhs' ? 'profiles_mahasiswa' : 'profiles_umkm';
    const status = approve ? 'verified' : 'rejected';
    await (supabase.from(table) as any).update({ status_verif: status, rejection_reason: reason || null }).eq('user_id', userId);
    await (supabase.from('audit_logs') as any).insert({ admin_id: user?.id, action_performed: approve ? 'approve_user' : 'reject_user', target_id: userId, target_table: table, details: reason || 'approved' });
    await (supabase.from('notifications') as any).insert({ user_id: userId, type: 'verification', title: approve ? 'Verifikasi Disetujui' : 'Verifikasi Ditolak', message: approve ? 'Selamat! Akun Anda telah diverifikasi.' : `Verifikasi ditolak: ${reason || 'Tidak memenuhi syarat'}` });
    loadPending(); loadUsers(); setSaving(false);
  }

  async function resolveDispute(dispId: string, projectId: string, resolution: 'resolved_refund' | 'resolved_payout', notes: string) {
    setSaving(true);
    await (supabase.from('disputes') as any).update({ status: resolution, resolution_notes: notes, resolved_by: user?.id, resolved_at: new Date().toISOString() }).eq('id', dispId);
    if (resolution === 'resolved_refund') {
      await (supabase.from('projects') as any).update({ status: 'cancelled', dispute_status: 'resolved' }).eq('id', projectId);
      const { data: tx } = await supabase.from('transactions').select('*').eq('project_id', projectId).maybeSingle();
      if (tx) await (supabase.from('transactions') as any).update({ status_escrow: 'refunded' }).eq('id', (tx as Transaction).id);
    } else {
      await (supabase.from('projects') as any).update({ status: 'completed', dispute_status: 'resolved' }).eq('id', projectId);
      const { data: tx } = await supabase.from('transactions').select('*').eq('project_id', projectId).maybeSingle();
      if (tx) await (supabase.from('transactions') as any).update({ status_escrow: 'released', released_at: new Date().toISOString() }).eq('id', (tx as Transaction).id);
    }
    await (supabase.from('audit_logs') as any).insert({ admin_id: user?.id, action_performed: resolution, target_id: dispId, target_table: 'disputes', details: notes });
    loadDisputes(); setSaving(false);
  }

  async function processWithdrawal(wdId: string, approve: boolean) {
    setSaving(true);
    await (supabase.from('withdrawals') as any).update({ status: approve ? 'processed' : 'rejected', processed_by: user?.id, processed_at: new Date().toISOString() }).eq('id', wdId);
    await (supabase.from('audit_logs') as any).insert({ admin_id: user?.id, action_performed: approve ? 'approve_withdrawal' : 'reject_withdrawal', target_id: wdId, target_table: 'withdrawals' });
    loadWithdrawals(); setSaving(false);
  }

  async function toggleKillSwitch() {
    const newVal = !killSwitch;
    setKillSwitch(newVal);
    await (supabase.from('platform_settings') as any).update({ value: String(newVal), updated_by: user?.id, updated_at: new Date().toISOString() }).eq('key', 'kill_switch_transactions');
    await (supabase.from('audit_logs') as any).insert({ admin_id: user?.id, action_performed: 'toggle_kill_switch', target_table: 'platform_settings', details: `Kill switch ${newVal ? 'ACTIVATED' : 'deactivated'}` });
  }

  async function sendBroadcast() {
    if (!user || !broadcastMsg.title || !broadcastMsg.message) return;
    setSaving(true);
    await (supabase.from('broadcasts') as any).insert({ admin_id: user.id, title: broadcastMsg.title, message: broadcastMsg.message, target_role: broadcastMsg.target_role });
    let userIds: string[] = [];
    if (broadcastMsg.target_role === 'umkm') { const { data } = await supabase.from('profiles_umkm').select('user_id'); userIds = ((data as { user_id: string }[]) || []).map((u) => u.user_id); }
    else if (broadcastMsg.target_role === 'mahasiswa') { const { data } = await supabase.from('profiles_mahasiswa').select('user_id'); userIds = ((data as { user_id: string }[]) || []).map((u) => u.user_id); }
    else { const [d1, d2] = await Promise.all([supabase.from('profiles_umkm').select('user_id'), supabase.from('profiles_mahasiswa').select('user_id')]); userIds = [...((d1.data as { user_id: string }[]) || []), ...((d2.data as { user_id: string }[]) || [])].map((u) => u.user_id); }
    const notifInserts = userIds.map((uid) => ({ user_id: uid, type: 'broadcast', title: broadcastMsg.title, message: broadcastMsg.message }));
    if (notifInserts.length > 0) await (supabase.from('notifications') as any).insert(notifInserts);
    setBroadcastMsg({ title: '', message: '', target_role: 'all' }); setShowBroadcast(false); setSaving(false); loadBroadcasts();
  }

  async function banUser(userId: string, _name: string, reason: string) {
    setSaving(true);
    await (supabase.from('profiles_mahasiswa') as any).update({ status_verif: 'rejected', rejection_reason: `BANNED: ${reason}` }).eq('user_id', userId);
    await (supabase.from('profiles_umkm') as any).update({ status_verif: 'rejected', rejection_reason: `BANNED: ${reason}` }).eq('user_id', userId);
    await (supabase.from('audit_logs') as any).insert({ admin_id: user?.id, action_performed: 'ban_user', target_id: userId, target_table: 'profiles', details: reason });
    setSelectedUser(null); setBanReason(''); setSaving(false); loadUsers();
  }

  async function openTicket(t: SupportTicket) {
    setSelectedTicket(t);
    const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', t.id).order('created_at', { ascending: true });
    setTicketMsgs((data as TicketMessage[]) || []);
  }

  async function sendTicketReply() {
    if (!selectedTicket || !ticketReply.trim() || !user) return;
    await (supabase.from('ticket_messages') as any).insert({ ticket_id: selectedTicket.id, sender_id: user.id, content: ticketReply.trim(), is_from_admin: true });
    if (selectedTicket.status === 'open') await (supabase.from('support_tickets') as any).update({ status: 'in_progress' }).eq('id', selectedTicket.id);
    setTicketReply('');
    const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', selectedTicket.id).order('created_at', { ascending: true });
    setTicketMsgs((data as TicketMessage[]) || []);
    loadTickets();
  }

  async function resolveTicket(t: SupportTicket) {
    setSaving(true);
    await (supabase.from('support_tickets') as any).update({ status: 'resolved' }).eq('id', t.id);
    await (supabase.from('notifications') as any).insert({ user_id: t.user_id, type: 'verification', title: 'Tiket Selesai', message: `Tiket "${t.subject}" telah ditandai selesai oleh admin.` });
    await (supabase.from('audit_logs') as any).insert({ admin_id: user?.id, action_performed: 'resolve_ticket', target_id: t.id, target_table: 'support_tickets' });
    setSaving(false); loadTickets();
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size={32} className="text-emerald-500" /></div>;

  const tabs: { id: AdminTab; label: string; icon: typeof Shield; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'verification', label: 'Verifikasi', icon: CheckCircle2, badge: pendingMhs.length + pendingUmkm.length },
    { id: 'disputes', label: 'Sengketa', icon: AlertTriangle, badge: disputes.length },
    { id: 'finance', label: 'Keuangan', icon: Wallet, badge: pendingWds.length },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'support', label: 'Support', icon: LifeBuoy, badge: tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length },
    { id: 'broadcast', label: 'Broadcast', icon: Send },
    { id: 'audit', label: 'Audit Log', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-navy-100 flex items-center justify-center"><Shield size={24} className="text-navy-600" /></div>
        <div><h2 className="text-lg font-semibold text-navy-800">Pusat Kendali Admin</h2><p className="text-sm text-gray-500">Command Center Skillnex</p></div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-3">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-navy-700 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            <t.icon size={16} /> {t.label}
            {t.badge ? <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tab === t.id ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Dana di Escrow" value={formatRupiah(stats.totalEscrow)} icon={Wallet} color="bg-emerald-50 text-emerald-600" />
            <StatCard label="Komisi Terkumpul" value={formatRupiah(stats.totalCommission)} icon={DollarSign} color="bg-navy-50 text-navy-600" />
            <StatCard label="Total Penarikan" value={formatRupiah(stats.totalWithdrawn)} icon={Banknote} color="bg-sunshine-50 text-sunshine-600" />
            <StatCard label="Sengketa Aktif" value={stats.openDisputes} icon={AlertTriangle} color="bg-red-50 text-red-500" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={stats.totalUsers} icon={Users} color="bg-navy-50 text-navy-600" />
            <StatCard label="Total Proyek" value={stats.totalProjects} icon={Briefcase} color="bg-emerald-50 text-emerald-600" />
            <StatCard label="Pending Verifikasi" value={pendingMhs.length + pendingUmkm.length} icon={Clock} color="bg-sunshine-50 text-sunshine-600" />
            <StatCard label="Pending Withdrawal" value={pendingWds.length} icon={Wallet} color="bg-red-50 text-red-500" />
          </div>
          <div className={`card p-5 ${killSwitch ? 'border-red-300 bg-red-50' : 'border-emerald-200 bg-emerald-50/50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${killSwitch ? 'bg-red-100' : 'bg-emerald-100'}`}><Power size={20} className={killSwitch ? 'text-red-500' : 'text-emerald-600'} /></div>
                <div><h3 className="font-semibold text-navy-800">Global Kill Switch</h3><p className="text-sm text-gray-500">{killSwitch ? 'Transaksi DINONAKTIFKAN. Semua pembayaran diblokir.' : 'Transaksi aktif dan berjalan normal.'}</p></div>
              </div>
              <button onClick={toggleKillSwitch} className={`relative w-14 h-7 rounded-full transition-colors ${killSwitch ? 'bg-red-500' : 'bg-emerald-500'}`}>
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform ${killSwitch ? 'translate-x-7' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification */}
      {tab === 'verification' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-navy-800">Antrean Verifikasi ({pendingMhs.length + pendingUmkm.length})</h3>
          {pendingMhs.length === 0 && pendingUmkm.length === 0 ? <EmptyState icon={<CheckCircle2 size={28} />} title="Tidak Ada Antrean" description="Semua akun telah diverifikasi." /> : (
            <div className="space-y-3">
              {pendingMhs.map((m) => (
                <div key={m.id} className="card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {m.foto_url ? <img src={m.foto_url} alt={m.nama_lengkap} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-semibold text-emerald-700">{getInitials(m.nama_lengkap)}</div>}
                    <div><div className="font-medium text-navy-800 text-sm">{m.nama_lengkap}</div><div className="text-xs text-gray-500">{m.universitas} · {m.jurusan}</div></div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="!px-3 !py-1.5 !text-xs" onClick={() => verifyUser(m.user_id, 'mhs', false, 'Dokumen tidak valid')}><XCircle size={14} /> Tolak</Button>
                    <Button className="!px-3 !py-1.5 !text-xs" onClick={() => verifyUser(m.user_id, 'mhs', true)}><CheckCircle2 size={14} /> Setujui</Button>
                  </div>
                </div>
              ))}
              {pendingUmkm.map((u) => (
                <div key={u.id} className="card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {u.logo_url ? <img src={u.logo_url} alt={u.nama_umkm} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center text-sm font-semibold text-navy-700">{getInitials(u.nama_umkm)}</div>}
                    <div><div className="font-medium text-navy-800 text-sm">{u.nama_umkm}</div><div className="text-xs text-gray-500">{u.nama_pemilik} · {u.kategori_bisnis || 'UMKM'}</div></div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="!px-3 !py-1.5 !text-xs" onClick={() => verifyUser(u.user_id, 'umkm', false, 'Data tidak lengkap')}><XCircle size={14} /> Tolak</Button>
                    <Button className="!px-3 !py-1.5 !text-xs" onClick={() => verifyUser(u.user_id, 'umkm', true)}><CheckCircle2 size={14} /> Setujui</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Disputes */}
      {tab === 'disputes' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-navy-800">Sengketa Aktif ({disputes.length})</h3>
          {disputes.length === 0 ? <EmptyState icon={<CheckCircle2 size={28} />} title="Tidak Ada Sengketa" description="Semua proyek berjalan lancar." /> : (
            <div className="space-y-3">
              {disputes.map((d) => (
                <div key={d.id} className="card p-5 border-red-200">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div><div className="font-medium text-navy-800">{d.projectTitle}</div><div className="text-sm text-gray-500 mt-1">{d.reason}</div></div>
                    <span className="badge-red text-xs">{d.status}</span>
                  </div>
                  {d.description && <p className="text-sm text-gray-600 mb-3">{d.description}</p>}
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <Button variant="outline" className="!text-xs flex-1" onClick={() => { const notes = prompt('Catatan resolusi:'); if (notes) resolveDispute(d.id, d.project_id, 'resolved_refund', notes); }}><XCircle size={14} /> Refund ke UMKM</Button>
                    <Button className="!text-xs flex-1" onClick={() => { const notes = prompt('Catatan resolusi:'); if (notes) resolveDispute(d.id, d.project_id, 'resolved_payout', notes); }}><CheckCircle2 size={14} /> Cairkan ke Mahasiswa</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Finance */}
      {tab === 'finance' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-navy-800">Payout Approval ({pendingWds.length})</h3>
          {pendingWds.length === 0 ? <EmptyState icon={<Wallet size={28} />} title="Tidak Ada Penarikan Pending" description="Tidak ada permintaan penarikan dana saat ini." /> : (
            <div className="space-y-3">
              {pendingWds.map((w) => (
                <div key={w.id} className="card p-4 flex items-center justify-between">
                  <div><div className="font-medium text-navy-800">{formatRupiah(w.amount)}</div><div className="text-xs text-gray-500">{w.bank_name} · {w.bank_account_number} · {timeAgo(w.requested_at)}</div></div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="!px-3 !py-1.5 !text-xs" onClick={() => processWithdrawal(w.id, false)}><XCircle size={14} /> Tolak</Button>
                    <Button className="!px-3 !py-1.5 !text-xs" onClick={() => processWithdrawal(w.id, true)}><CheckCircle2 size={14} /> Proses</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari user..." className="input-field pl-11" />
          </div>
          <div className="space-y-2">
            {allUsers.mhs.filter((m) => !search || m.nama_lengkap.toLowerCase().includes(search.toLowerCase())).map((m) => (
              <div key={m.id} className="card p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {m.foto_url ? <img src={m.foto_url} alt={m.nama_lengkap} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-semibold text-emerald-700">{getInitials(m.nama_lengkap)}</div>}
                  <div><div className="text-sm font-medium text-navy-800">{m.nama_lengkap}</div><div className="text-xs text-gray-400">Mahasiswa · {m.universitas || '-'}</div></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${m.status_verif === 'verified' ? 'badge-emerald' : m.status_verif === 'pending' ? 'badge-sunshine' : 'badge-red'}`}>{m.status_verif}</span>
                  {m.status_verif !== 'rejected' && <button onClick={() => setSelectedUser({ id: m.user_id, name: m.nama_lengkap, role: 'mahasiswa' })} className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500"><Ban size={14} /></button>}
                </div>
              </div>
            ))}
            {allUsers.umkm.filter((u) => !search || u.nama_umkm?.toLowerCase().includes(search.toLowerCase())).map((u) => (
              <div key={u.id} className="card p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {u.logo_url ? <img src={u.logo_url} alt={u.nama_umkm} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center text-xs font-semibold text-navy-700">{getInitials(u.nama_umkm)}</div>}
                  <div><div className="text-sm font-medium text-navy-800">{u.nama_umkm}</div><div className="text-xs text-gray-400">UMKM · {u.nama_pemilik}</div></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${u.status_verif === 'verified' ? 'badge-emerald' : u.status_verif === 'pending' ? 'badge-sunshine' : 'badge-red'}`}>{u.status_verif}</span>
                  {u.status_verif !== 'rejected' && <button onClick={() => setSelectedUser({ id: u.user_id, name: u.nama_umkm, role: 'umkm' })} className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500"><Ban size={14} /></button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Support Center */}
      {tab === 'support' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-navy-800">Support Center ({tickets.length})</h3>
          {tickets.length === 0 ? <EmptyState icon={<LifeBuoy size={28} />} title="Tidak Ada Tiket" description="Belum ada tiket bantuan yang masuk." /> : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div key={t.id} className="card p-4 cursor-pointer hover:border-emerald-300 transition-colors" onClick={() => openTicket(t)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center text-xs font-semibold text-navy-700">{getInitials(t.userName)}</div>
                      <div><div className="font-medium text-navy-800 text-sm">{t.subject}</div><div className="text-xs text-gray-400">{t.userName} · {timeAgo(t.created_at)}</div></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge-gray text-xs">{TICKET_CATEGORY_LABELS[t.category]}</span>
                      <span className={`badge text-xs ${t.status === 'open' ? 'badge-red' : t.status === 'in_progress' ? 'badge-sunshine' : t.status === 'resolved' ? 'badge-emerald' : 'badge-gray'}`}>{TICKET_STATUS_LABELS[t.status]}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{t.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Broadcast */}
      {tab === 'broadcast' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-navy-800">Smart Broadcast</h3>
            <Button onClick={() => setShowBroadcast(true)}><Send size={16} /> Buat Broadcast</Button>
          </div>
          {broadcasts.length === 0 ? (
            <EmptyState icon={<Send size={28} />} title="Belum Ada Broadcast" description="Kirim pengumuman ke seluruh atau sebagian pengguna." />
          ) : (
            <div className="space-y-3">
              {broadcasts.map((b) => (
                <div key={b.id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-navy-800 text-sm">{b.title}</div>
                    <div className="flex items-center gap-2">
                      <span className="badge-gray text-xs capitalize">{b.target_role}</span>
                      <span className="text-xs text-gray-400">{timeAgo(b.created_at)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{b.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit Log */}
      {tab === 'audit' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-navy-800">Audit Log ({auditLogs.length})</h3>
          {auditLogs.length === 0 ? <EmptyState icon={<History size={28} />} title="Belum Ada Log" description="Aktivitas admin akan tercatat di sini." /> : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="card p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center"><History size={14} className="text-navy-500" /></div>
                    <div>
                      <div className="text-sm font-medium text-navy-800">{log.action_performed}</div>
                      <div className="text-xs text-gray-400">{log.target_table || '-'} · {log.details || '-'}</div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{timeAgo(log.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings */}
      {tab === 'settings' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-navy-800">Platform Settings</h3>
          <div className={`card p-5 ${killSwitch ? 'border-red-300 bg-red-50' : 'border-emerald-200 bg-emerald-50/50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${killSwitch ? 'bg-red-100' : 'bg-emerald-100'}`}><Power size={20} className={killSwitch ? 'text-red-500' : 'text-emerald-600'} /></div>
                <div><h3 className="font-semibold text-navy-800">Global Kill Switch</h3><p className="text-sm text-gray-500">{killSwitch ? 'Transaksi DINONAKTIFKAN' : 'Transaksi aktif'}</p></div>
              </div>
              <button onClick={toggleKillSwitch} className={`relative w-14 h-7 rounded-full transition-colors ${killSwitch ? 'bg-red-500' : 'bg-emerald-500'}`}>
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform ${killSwitch ? 'translate-x-7' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban User Modal */}
      <Modal open={!!selectedUser} onClose={() => { setSelectedUser(null); setBanReason(''); }} title="Ban User" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Ban <span className="font-medium text-navy-700">{selectedUser?.name}</span> ({selectedUser?.role})?</p>
          <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Alasan Ban</label><input type="text" value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Contoh: Penipuan, spam, dll" className="input-field" /></div>
          <div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => { setSelectedUser(null); setBanReason(''); }}>Batal</Button><Button className="flex-1 !bg-red-500 hover:!bg-red-600" loading={saving} onClick={() => selectedUser && banUser(selectedUser.id, selectedUser.name, banReason)} disabled={!banReason}>Ban Permanen</Button></div>
        </div>
      </Modal>

      {/* Broadcast Modal */}
      <Modal open={showBroadcast} onClose={() => setShowBroadcast(false)} title="Kirim Broadcast" size="md">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Judul</label><input type="text" value={broadcastMsg.title} onChange={(e) => setBroadcastMsg({ ...broadcastMsg, title: e.target.value })} placeholder="Judul pengumuman" className="input-field" /></div>
          <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Pesan</label><textarea value={broadcastMsg.message} onChange={(e) => setBroadcastMsg({ ...broadcastMsg, message: e.target.value })} placeholder="Isi pesan..." rows={4} className="input-field resize-none" /></div>
          <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Target</label><select value={broadcastMsg.target_role} onChange={(e) => setBroadcastMsg({ ...broadcastMsg, target_role: e.target.value as 'all' | 'umkm' | 'mahasiswa' })} className="input-field cursor-pointer"><option value="all">Semua Pengguna</option><option value="umkm">Semua UMKM</option><option value="mahasiswa">Semua Mahasiswa</option></select></div>
          <div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setShowBroadcast(false)}>Batal</Button><Button className="flex-1" loading={saving} onClick={sendBroadcast} disabled={!broadcastMsg.title || !broadcastMsg.message}>Kirim</Button></div>
        </div>
      </Modal>

      {/* Ticket Detail Modal */}
      <Modal open={!!selectedTicket} onClose={() => setSelectedTicket(null)} title="Detail Tiket Bantuan" size="md">
        {selectedTicket && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div className="font-semibold text-navy-800">{selectedTicket.subject}</div>
              <div className="text-sm text-gray-500 mt-1">{selectedTicket.description}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge-gray">{TICKET_CATEGORY_LABELS[selectedTicket.category]}</span>
                <span className={`badge ${selectedTicket.status === 'open' ? 'badge-red' : selectedTicket.status === 'in_progress' ? 'badge-sunshine' : 'badge-emerald'}`}>{TICKET_STATUS_LABELS[selectedTicket.status]}</span>
              </div>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
              {ticketMsgs.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Belum ada pesan.</p> : (
                ticketMsgs.map((m) => (
                  <div key={m.id} className={`flex ${m.is_from_admin ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${m.is_from_admin ? 'bg-navy-100 text-navy-800 rounded-bl-md' : 'bg-emerald-500 text-white rounded-br-md'}`}>
                      {m.is_from_admin && <div className="text-xs font-semibold text-navy-600 mb-1">Admin</div>}
                      <p>{m.content}</p>
                      <div className={`text-xs mt-1 ${m.is_from_admin ? 'text-navy-400' : 'text-white/60'}`}>{timeAgo(m.created_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
              <>
                <div className="flex gap-2">
                  <input type="text" value={ticketReply} onChange={(e) => setTicketReply(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendTicketReply()} placeholder="Tulis balasan..." className="input-field flex-1" />
                  <Button onClick={sendTicketReply} disabled={!ticketReply.trim()}><MessageSquare size={18} /></Button>
                </div>
                <Button variant="outline" className="w-full" loading={saving} onClick={() => resolveTicket(selectedTicket)}><CheckCircle2 size={16} /> Tandai Selesai</Button>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: typeof Shield; color: string }) {
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}><Icon size={20} /></div>
      <div className="text-xl font-bold text-navy-800 truncate">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
