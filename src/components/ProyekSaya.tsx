import { useState, useEffect } from 'react';
import {
  Briefcase, Wallet, CheckCircle2, Star, Clock, AlertCircle, MessageCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Button, EmptyState, Spinner } from './ui';
import { Modal } from './Modal';
import { StarRating } from './StarRating';
import { ProjectWorkspace } from './ProjectWorkspace';
import {
  KATEGORI_SKILLS, STATUS_LABELS, STATUS_COLORS, formatRupiah, calculateFees,
  PROJECT_STEPS, type Project, type ProfileUmkm, type ProfileMahasiswa,
  type LayananType, type PaymentMethod,
} from '../lib/types';
import { createNotification, formatDate, getInitials, timeAgo } from '../lib/helpers';

interface ProyekSayaProps {
  onOpenChat: (projectId: string, receiverId: string, receiverName: string) => void;
  prefillMahasiswa?: { userId: string; id: string; name: string } | null;
  onPrefillConsumed?: () => void;
}

type ProjectWithCounter = Project & { counterpartyName: string; counterpartyUserId: string };

export function ProyekSaya({ onOpenChat, prefillMahasiswa, onPrefillConsumed }: ProyekSayaProps) {
  const { user, role, profileUmkm } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectWithCounter[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState<Project | null>(null);
  const [showReview, setShowReview] = useState<Project | null>(null);
  const [showSetPrice, setShowSetPrice] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({ judul: '', deskripsi: '', kategori: '', budget: '', deadline: '', scopeOfWork: '', layananType: 'basic' as LayananType });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris');
  const [processing, setProcessing] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewKomentar, setReviewKomentar] = useState('');
  const [agreedPrice, setAgreedPrice] = useState('');
  const [workspaceProject, setWorkspaceProject] = useState<Project | null>(null);

  useEffect(() => { loadAll(); }, [user]);
  useEffect(() => { if (prefillMahasiswa) { setShowCreate(true); } }, [prefillMahasiswa]);

  async function loadAll() {
    if (!user) return;
    setLoading(true);
    await loadProjects();
    setLoading(false);
  }

  async function loadProjects() {
    if (!user) return;
    const { data } = await supabase.from('projects').select('*').or(`umkm_user_id.eq.${user.id},mahasiswa_user_id.eq.${user.id}`).order('created_at', { ascending: false });
    if (!data) { setProjects([]); return; }
    const list: ProjectWithCounter[] = [];
    for (const p of data as Project[]) {
      let cpUid = '', cpName = '';
      if (role === 'umkm' && p.mahasiswa_user_id) {
        cpUid = p.mahasiswa_user_id;
        const { data: mhs } = await supabase.from('profiles_mahasiswa').select('nama_lengkap').eq('user_id', p.mahasiswa_user_id).maybeSingle();
        cpName = (mhs as ProfileMahasiswa | null)?.nama_lengkap || 'Mahasiswa';
      } else if (role === 'mahasiswa' && p.umkm_user_id) {
        cpUid = p.umkm_user_id;
        const { data: umkm } = await supabase.from('profiles_umkm').select('nama_umkm').eq('user_id', p.umkm_user_id).maybeSingle();
        cpName = (umkm as ProfileUmkm | null)?.nama_umkm || 'UMKM';
      }
      list.push({ ...p, counterpartyName: cpName, counterpartyUserId: cpUid });
    }
    setProjects(list);
  }

  async function createProject() {
    if (!user || !profileUmkm || !prefillMahasiswa) return;
    setProcessing(true);
    const { data: newProj } = await (supabase.from('projects') as any).insert({
      umkm_id: profileUmkm.id, mahasiswa_id: prefillMahasiswa.id,
      umkm_user_id: user.id, mahasiswa_user_id: prefillMahasiswa.userId,
      judul: newProject.judul, deskripsi: newProject.deskripsi,
      kategori: newProject.kategori || null, budget: newProject.budget ? parseFloat(newProject.budget) : null,
      deadline: newProject.deadline || null, scope_of_work: newProject.scopeOfWork || null,
      status: 'negotiation', layanan_type: newProject.layananType,
    }).select().single();
    if (newProj) await createNotification(prefillMahasiswa.userId, 'project', 'Penawaran Proyek Baru!', `Anda mendapat penawaran: ${newProject.judul}`, (newProj as Project).id);
    setNewProject({ judul: '', deskripsi: '', kategori: '', budget: '', deadline: '', scopeOfWork: '', layananType: 'basic' });
    setShowCreate(false); setProcessing(false); onPrefillConsumed?.(); loadAll();
  }

  async function setAgreedPriceForProject() {
    if (!showSetPrice || !agreedPrice) return;
    setProcessing(true);
    const price = parseFloat(agreedPrice);
    await (supabase.from('projects') as any).update({ harga_disepakati: price }).eq('id', showSetPrice.id);
    if (showSetPrice.mahasiswa_user_id) await createNotification(showSetPrice.mahasiswa_user_id, 'project', 'Harga Disepakati', `UMKM menetapkan harga ${formatRupiah(price)} untuk "${showSetPrice.judul}". Silakan terima atau tolak.`, showSetPrice.id);
    setShowSetPrice(null); setAgreedPrice(''); setProcessing(false); loadAll();
  }

  async function acceptProject(p: Project) {
    await (supabase.from('projects') as any).update({ status: 'negotiation', accepted_at: new Date().toISOString() }).eq('id', p.id);
    if (p.umkm_user_id) await createNotification(p.umkm_user_id, 'project', 'Penawaran Diterima!', `Mahasiswa menerima penawaran "${p.judul}". Silakan lakukan pembayaran ke escrow.`, p.id);
    loadAll();
  }

  async function rejectProject(p: Project) {
    await (supabase.from('projects') as any).update({ status: 'cancelled' }).eq('id', p.id);
    if (p.umkm_user_id) await createNotification(p.umkm_user_id, 'project', 'Penawaran Ditolak', `Mahasiswa menolak penawaran "${p.judul}".`, p.id);
    loadAll();
  }

  async function processPayment(p: Project) {
    if (!user || !p.harga_disepakati) return;
    setProcessing(true);
    const { komisi, handling, net } = calculateFees(p.harga_disepakati, p.layanan_type);
    await (supabase.from('transactions') as any).insert({
      project_id: p.id, umkm_user_id: user.id, mahasiswa_user_id: p.mahasiswa_user_id,
      amount: p.harga_disepakati, komisi_skillnex: komisi, handling_fee: handling, net_to_mahasiswa: net,
      metode_pembayaran: paymentMethod, status_escrow: 'held', payment_ref: `SKN-${Date.now()}`, paid_at: new Date().toISOString(),
    });
    await (supabase.from('projects') as any).update({ status: 'funded' }).eq('id', p.id);
    if (p.mahasiswa_user_id) await createNotification(p.mahasiswa_user_id, 'payment', 'Pembayaran Diterima!', `Pembayaran ${formatRupiah(p.harga_disepakati)} untuk "${p.judul}" masuk ke escrow. Dana aman!`, p.id);
    await createNotification(user.id, 'payment', 'Pembayaran Berhasil', `Pembayaran ${formatRupiah(p.harga_disepakati)} via ${paymentMethod.toUpperCase()} berhasil. Dana dipegang di escrow.`, p.id);
    setShowPayment(null); setProcessing(false); loadAll();
  }

  async function submitReview() {
    if (!showReview || !user) return;
    setProcessing(true);
    await (supabase.from('reviews') as any).insert({ project_id: showReview.id, umkm_user_id: user.id, mahasiswa_user_id: showReview.mahasiswa_user_id!, rating: reviewRating, komentar: reviewKomentar || null });
    if (showReview.mahasiswa_id) await (supabase.from('portfolios') as any).insert({ mahasiswa_id: showReview.mahasiswa_id, project_id: showReview.id, judul: showReview.judul, deskripsi: showReview.deskripsi, kategori: showReview.kategori, image_url: null, rating: reviewRating, is_from_project: true });
    if (showReview.mahasiswa_user_id) await createNotification(showReview.mahasiswa_user_id, 'review', 'Rating Baru!', `Anda mendapat rating ${reviewRating} bintang untuk "${showReview.judul}".`, showReview.id);
    setShowReview(null); setReviewRating(5); setReviewKomentar(''); setProcessing(false); loadAll();
  }

  if (workspaceProject) return <ProjectWorkspace project={workspaceProject} onBack={() => { setWorkspaceProject(null); loadAll(); }} onOpenChat={onOpenChat} onUpdated={loadAll} />;

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size={32} className="text-emerald-500" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-navy-800">Pekerjaan Saya</h2>
        {role === 'umkm' && <Button className="!px-4 !py-2 !text-xs" onClick={() => setShowCreate(true)} disabled={!prefillMahasiswa}><Briefcase size={14} /> Tawarkan Proyek</Button>}
      </div>

      {role === 'umkm' && !prefillMahasiswa && projects.length === 0 && (
        <div className="card p-6 mb-4 bg-emerald-50/50 border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><MessageCircle size={20} className="text-emerald-600" /></div>
            <div><h3 className="font-medium text-navy-800 text-sm">Mulai dari Cari Talenta</h3><p className="text-xs text-gray-500 mt-0.5">Pilih talenta mahasiswa, lalu tawarkan proyek langsung ke mereka.</p></div>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <EmptyState icon={<Briefcase size={28} />} title="Belum Ada Pekerjaan" description={role === 'umkm' ? "Cari talenta dan tawarkan pekerjaan langsung." : "Belum ada pekerjaan yang ditawarkan kepada Anda."} />
      ) : (
        <div className="space-y-4">
          {projects.map((p) => (
            <div key={p.id} className="card p-5">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-semibold text-navy-800">{p.judul}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1"><span>{role === 'umkm' ? 'Talenta' : 'UMKM'}:</span><span className="font-medium text-navy-700">{p.counterpartyName}</span></div>
                    </div>
                    <span className={STATUS_COLORS[p.status]}>{STATUS_LABELS[p.status]}</span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{p.deskripsi}</p>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {p.kategori && <span className="badge-gray">{p.kategori}</span>}
                    {p.harga_disepakati && <span className="flex items-center gap-1 text-emerald-600 font-medium"><Wallet size={14} />{formatRupiah(p.harga_disepakati)}</span>}
                    {p.budget && !p.harga_disepakati && <span className="flex items-center gap-1 text-gray-500"><Wallet size={14} />Budget: {formatRupiah(p.budget)}</span>}
                    {p.deadline && <span className="flex items-center gap-1 text-gray-500"><Clock size={14} />{formatDate(p.deadline)}</span>}
                    <span className="text-xs text-gray-400">{timeAgo(p.created_at)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:flex-col lg:w-48">
                  <Button variant="outline" className="!px-3 !py-2 !text-xs" onClick={() => onOpenChat(p.id, p.counterpartyUserId, p.counterpartyName)}><MessageCircle size={14} /> Chat</Button>
                  {(p.status === 'funded' || p.status === 'in_progress' || p.status === 'review' || p.status === 'revision' || p.status === 'disputed') && <Button className="!px-3 !py-2 !text-xs" onClick={() => setWorkspaceProject(p)}><Briefcase size={14} /> Workspace</Button>}

                  {/* UMKM: Set price */}
                  {role === 'umkm' && p.status === 'negotiation' && !p.harga_disepakati && <Button className="!px-3 !py-2 !text-xs" onClick={() => { setShowSetPrice(p); setAgreedPrice(p.budget?.toString() || ''); }}><Wallet size={14} /> Set Harga</Button>}
                  {/* UMKM: Pay to escrow */}
                  {role === 'umkm' && p.status === 'negotiation' && p.harga_disepakati && <Button className="!px-3 !py-2 !text-xs" onClick={() => setShowPayment(p)}><Wallet size={14} /> Bayar ke Escrow</Button>}
                  {/* UMKM: Rate after completion */}
                  {role === 'umkm' && p.status === 'completed' && !p.is_umkm_reviewed && <Button className="!px-3 !py-2 !text-xs" onClick={() => setShowReview(p)}><Star size={14} /> Beri Rating</Button>}

                  {/* Mahasiswa: Accept/Reject offer */}
                  {role === 'mahasiswa' && p.status === 'negotiation' && !p.harga_disepakati && <span className="badge-sunshine text-xs">Menunggu harga dari UMKM</span>}
                  {role === 'mahasiswa' && p.status === 'negotiation' && p.harga_disepakati && <>
                    <Button className="!px-3 !py-2 !text-xs" onClick={() => acceptProject(p)}><CheckCircle2 size={14} /> Terima</Button>
                    <Button variant="outline" className="!px-3 !py-2 !text-xs" onClick={() => rejectProject(p)}>Tolak</Button>
                  </>}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs">
                  {PROJECT_STEPS.map((s, i) => {
                    const statusOrder = ['negotiation', 'funded', 'in_progress', 'review', 'completed'];
                    const currentIdx = statusOrder.indexOf(p.status);
                    const isActive = i <= currentIdx;
                    return (
                      <div key={s.key} className="flex items-center flex-1">
                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                        {i < PROJECT_STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < currentIdx ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">{PROJECT_STEPS.map((s) => <span key={s.key}>{s.label}</span>)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); onPrefillConsumed?.(); }} title="Tawarkan Pekerjaan" size="md">
        <div className="space-y-4">
          {prefillMahasiswa && <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">Menawarkan proyek ke: <strong>{prefillMahasiswa.name}</strong></div>}
          <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Judul Proyek</label><input type="text" value={newProject.judul} onChange={(e) => setNewProject({ ...newProject, judul: e.target.value })} placeholder="Contoh: Desain Logo untuk Cafe" className="input-field" /></div>
          <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Deskripsi Proyek</label><textarea value={newProject.deskripsi} onChange={(e) => setNewProject({ ...newProject, deskripsi: e.target.value })} placeholder="Jelaskan detail proyek..." rows={4} className="input-field resize-none" /></div>
          <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Scope of Work</label><textarea value={newProject.scopeOfWork} onChange={(e) => setNewProject({ ...newProject, scopeOfWork: e.target.value })} placeholder="Ruang lingkup pekerjaan yang disepakati..." rows={3} className="input-field resize-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Kategori</label><select value={newProject.kategori} onChange={(e) => setNewProject({ ...newProject, kategori: e.target.value })} className="input-field cursor-pointer"><option value="">Pilih...</option>{KATEGORI_SKILLS.map((k) => <option key={k} value={k}>{k}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Budget (Rp)</label><input type="number" value={newProject.budget} onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })} placeholder="500000" className="input-field" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Deadline</label><input type="date" value={newProject.deadline} onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Tipe Layanan</label><select value={newProject.layananType} onChange={(e) => setNewProject({ ...newProject, layananType: e.target.value as LayananType })} className="input-field cursor-pointer"><option value="basic">Basic (5%)</option><option value="priority">Priority (10%)</option></select></div>
          </div>
          <div className="flex gap-3 pt-2"><Button variant="outline" className="flex-1" onClick={() => { setShowCreate(false); onPrefillConsumed?.(); }}>Batal</Button><Button className="flex-1" loading={processing} onClick={createProject} disabled={!newProject.judul || !newProject.deskripsi || !prefillMahasiswa}>Kirim Penawaran</Button></div>
        </div>
      </Modal>

      {/* Set Price Modal */}
      <Modal open={!!showSetPrice} onClose={() => setShowSetPrice(null)} title="Tetapkan Harga Disepakati" size="sm">
        {showSetPrice && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200"><div className="text-sm text-gray-500 mb-1">Proyek</div><div className="font-semibold text-navy-800">{showSetPrice.judul}</div>{showSetPrice.budget && <div className="text-sm text-gray-500 mt-1">Budget awal: {formatRupiah(showSetPrice.budget)}</div>}</div>
            <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Harga Disepakati (Rp)</label><input type="number" value={agreedPrice} onChange={(e) => setAgreedPrice(e.target.value)} placeholder="500000" className="input-field" /></div>
            {agreedPrice && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1 text-sm"><div className="flex justify-between"><span className="text-gray-500">Komisi ({showSetPrice.layanan_type === 'priority' ? '10%' : '5%'})</span><span className="text-red-500">- {formatRupiah(calculateFees(parseFloat(agreedPrice), showSetPrice.layanan_type).komisi)}</span></div><div className="flex justify-between"><span className="text-gray-500">Handling (2%)</span><span className="text-red-500">- {formatRupiah(calculateFees(parseFloat(agreedPrice), showSetPrice.layanan_type).handling)}</span></div><div className="flex justify-between font-semibold pt-1 border-t border-emerald-200"><span className="text-navy-800">Mahasiswa terima</span><span className="text-emerald-600">{formatRupiah(calculateFees(parseFloat(agreedPrice), showSetPrice.layanan_type).net)}</span></div></div>}
            <div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setShowSetPrice(null)}>Batal</Button><Button className="flex-1" loading={processing} onClick={setAgreedPriceForProject} disabled={!agreedPrice}>Set Harga</Button></div>
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal open={!!showPayment} onClose={() => setShowPayment(null)} title="Pembayaran ke Escrow" size="md">
        {showPayment && showPayment.harga_disepakati && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-navy-50 border border-navy-200"><div className="text-sm text-navy-600 mb-1">Proyek</div><div className="font-semibold text-navy-800">{showPayment.judul}</div></div>
            <div><label className="block text-sm font-medium text-navy-700 mb-2">Metode Pembayaran</label><div className="grid grid-cols-3 gap-3">{(['qris', 'transfer', 'e-wallet'] as PaymentMethod[]).map((m) => <button key={m} onClick={() => setPaymentMethod(m)} className={`p-3 rounded-xl border-2 text-center transition-all ${paymentMethod === m ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}><div className="font-semibold text-navy-800 text-sm uppercase">{m.replace('-', ' ')}</div></button>)}</div></div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2"><div className="flex justify-between text-sm"><span className="text-gray-500">Harga</span><span className="font-medium text-navy-800">{formatRupiah(showPayment.harga_disepakati)}</span></div><div className="flex justify-between text-sm"><span className="text-gray-500">Komisi ({showPayment.layanan_type === 'priority' ? '10%' : '5%'})</span><span className="text-red-500">- {formatRupiah(calculateFees(showPayment.harga_disepakati, showPayment.layanan_type).komisi)}</span></div><div className="flex justify-between text-sm"><span className="text-gray-500">Handling (2%)</span><span className="text-red-500">- {formatRupiah(calculateFees(showPayment.harga_disepakati, showPayment.layanan_type).handling)}</span></div><div className="pt-2 border-t border-gray-200 flex justify-between"><span className="font-semibold text-navy-800">Ke Mahasiswa</span><span className="font-bold text-emerald-600">{formatRupiah(calculateFees(showPayment.harga_disepakati, showPayment.layanan_type).net)}</span></div></div>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-sunshine-50 border border-sunshine-200"><AlertCircle size={18} className="text-sunshine-600 flex-shrink-0 mt-0.5" /><p className="text-xs text-sunshine-700">Dana ditahan di escrow dan baru dilepas setelah proyek selesai dan Anda menekan "Setujui".</p></div>
            <div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setShowPayment(null)}>Batal</Button><Button className="flex-1" loading={processing} onClick={() => processPayment(showPayment)}><Wallet size={18} /> Bayar {formatRupiah(showPayment.harga_disepakati)}</Button></div>
          </div>
        )}
      </Modal>

      {/* Review Modal */}
      <Modal open={!!showReview} onClose={() => setShowReview(null)} title="Beri Rating & Ulasan" size="sm">
        {showReview && (
          <div className="space-y-4">
            <div className="text-center py-4"><div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-xl font-semibold text-emerald-700 mx-auto mb-3">{getInitials(showReview.judul)}</div><h3 className="font-semibold text-navy-800">{showReview.judul}</h3></div>
            <div className="flex justify-center"><StarRating rating={reviewRating} size={36} interactive onChange={setReviewRating} /></div>
            <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Ulasan (opsional)</label><textarea value={reviewKomentar} onChange={(e) => setReviewKomentar(e.target.value)} placeholder="Bagikan pengalaman Anda..." rows={4} className="input-field resize-none" /></div>
            <div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setShowReview(null)}>Batal</Button><Button className="flex-1" loading={processing} onClick={submitReview}>Kirim Rating</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
