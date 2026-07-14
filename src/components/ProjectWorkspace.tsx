import { useState, useEffect } from 'react';
import {
  MessageCircle, Upload, CheckCircle2, XCircle,
  AlertTriangle, FileText, Shield, ArrowLeft, Download,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Spinner, Button } from './ui';
import { Modal } from './Modal';
import { StarRating } from './StarRating';
import { STATUS_LABELS, STATUS_COLORS, formatRupiah, type Project, type ProjectFile, type Transaction, type Dispute } from '../lib/types';
import { timeAgo, timeLeft } from '../lib/helpers';

interface ProjectWorkspaceProps {
  project: Project;
  onBack: () => void;
  onOpenChat: (projectId: string, receiverId: string, receiverName: string) => void;
  onUpdated: () => void;
}

export function ProjectWorkspace({ project, onBack, onOpenChat, onUpdated }: ProjectWorkspaceProps) {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showRevision, setShowRevision] = useState(false);
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitNote, setSubmitNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [otherName, setOtherName] = useState('');
  const [otherId, setOtherId] = useState('');

  useEffect(() => { loadWorkspace(); }, [project.id]);

  async function loadWorkspace() {
    setLoading(true);
    const { data: tx } = await supabase.from('transactions').select('*').eq('project_id', project.id).maybeSingle();
    setTransaction(tx as Transaction | null);
    const { data: fls } = await supabase.from('project_files').select('*').eq('project_id', project.id).order('created_at', { ascending: false });
    setFiles((fls as ProjectFile[]) || []);
    const { data: disp } = await supabase.from('disputes').select('*').eq('project_id', project.id).order('created_at', { ascending: false }).limit(1);
    setDispute((disp as Dispute[])?.[0] || null);

    if (role === 'umkm') {
      const { data: mhs } = await supabase.from('profiles_mahasiswa').select('nama_lengkap').eq('user_id', project.mahasiswa_user_id).maybeSingle();
      setOtherName((mhs as { nama_lengkap: string } | null)?.nama_lengkap || 'Mahasiswa');
    } else {
      const { data: umkm } = await supabase.from('profiles_umkm').select('nama_umkm').eq('user_id', project.umkm_user_id).maybeSingle();
      setOtherName((umkm as { nama_umkm: string } | null)?.nama_umkm || 'UMKM');
    }
    setOtherId(role === 'umkm' ? project.mahasiswa_user_id || '' : project.umkm_user_id);
    setLoading(false);
  }

  async function uploadProjectFile(file: File): Promise<string | null> {
    const fileExt = file.name.split('.').pop();
    const fileName = `project_${project.id}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('project-files').upload(fileName, file);
    if (error) { console.error('Upload error:', error); return null; }
    const { data } = supabase.storage.from('project-files').getPublicUrl(fileName);
    return data.publicUrl || null;
  }

  async function submitWork() {
    if (!user || !submitFile) return;
    setSaving(true);
    const fileUrl = await uploadProjectFile(submitFile);
    if (!fileUrl) { setSaving(false); return; }
    await (supabase.from('project_files') as any).insert({ project_id: project.id, uploaded_by: user.id, file_name: submitFile.name, file_url: fileUrl, file_type: submitFile.type, is_final_submission: true });
    await (supabase.from('projects') as any).update({ status: 'review', work_submitted_at: new Date().toISOString(), revision_notes: submitNote || null }).eq('id', project.id);
    // Notify UMKM
    await (supabase.from('notifications') as any).insert({ user_id: project.umkm_user_id, type: 'project', title: 'Hasil Kerja Diterima', message: `Mahasiswa telah mengirim hasil kerja untuk "${project.judul}"`, project_id: project.id });
    setSubmitFile(null); setSubmitNote(''); setShowSubmit(false); setSaving(false); onUpdated();
  }

  async function requestRevision() {
    setSaving(true);
    await (supabase.from('projects') as any).update({ status: 'revision', revision_notes: revisionNotes }).eq('id', project.id);
    await (supabase.from('notifications') as any).insert({ user_id: project.mahasiswa_user_id, type: 'project', title: 'Revisi Diminta', message: `UMKM meminta revisi untuk "${project.judul}": ${revisionNotes}`, project_id: project.id });
    setRevisionNotes(''); setShowRevision(false); setSaving(false); onUpdated();
  }

  async function approveAndComplete() {
    setSaving(true);
    // Update project status
    await (supabase.from('projects') as any).update({ status: 'completed', is_umkm_reviewed: true, completion_notes: reviewComment || null }).eq('id', project.id);
    // Release escrow
    if (transaction) {
      await (supabase.from('transactions') as any).update({ status_escrow: 'released', released_at: new Date().toISOString() }).eq('id', transaction.id);
    }
    // Add review
    if (project.mahasiswa_user_id) {
      await (supabase.from('reviews') as any).insert({ project_id: project.id, umkm_user_id: project.umkm_user_id, mahasiswa_user_id: project.mahasiswa_user_id, rating: reviewRating, komentar: reviewComment || null });
      // Auto-create portfolio entry
      if (project.mahasiswa_id) {
        await (supabase.from('portfolios') as any).insert({ mahasiswa_id: project.mahasiswa_id, project_id: project.id, judul: project.judul, deskripsi: project.deskripsi, kategori: project.kategori, image_url: null, rating: reviewRating, is_from_project: true });
      }
      // Create invoice
      const invNum = `INV-${Date.now().toString().slice(-8)}`;
      const amount = project.harga_disepakati || project.budget || 0;
      const komisi = transaction?.komisi_skillnex || 0;
      const handling = transaction?.handling_fee || 0;
      const net = transaction?.net_to_mahasiswa || 0;
      await (supabase.from('invoices') as any).insert({ project_id: project.id, invoice_number: invNum, umkm_user_id: project.umkm_user_id, mahasiswa_user_id: project.mahasiswa_user_id, amount, komisi_amount: komisi, handling_fee: handling, net_amount: net, status: 'paid' });
      // Notify mahasiswa
      await (supabase.from('notifications') as any).insert({ user_id: project.mahasiswa_user_id, type: 'payment', title: 'Dana Dilepas!', message: `Dana untuk "${project.judul}" telah dicairkan ke saldo Anda.`, project_id: project.id });
    }
    setReviewRating(5); setReviewComment(''); setShowReview(false); setSaving(false); onUpdated();
  }

  async function raiseDispute() {
    if (!user) return;
    setSaving(true);
    await (supabase.from('disputes') as any).insert({ project_id: project.id, raised_by: user.id, reason: disputeReason, description: disputeDesc });
    await (supabase.from('projects') as any).update({ status: 'disputed', dispute_status: 'open' }).eq('id', project.id);
    // Notify admin (find super_admin)
    const { data: admins } = await supabase.from('admin_users').select('user_id').eq('admin_role', 'super_admin');
    if (admins) for (const a of admins as { user_id: string }[]) {
      await (supabase.from('notifications') as any).insert({ user_id: a.user_id, type: 'project', title: 'Sengketa Baru', message: `Sengketa dilaporkan untuk proyek "${project.judul}"`, project_id: project.id });
    }
    setDisputeReason(''); setDisputeDesc(''); setShowDispute(false); setSaving(false); onUpdated();
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size={32} className="text-emerald-500" /></div>;

  const deadlineLeft = project.deadline ? timeLeft(project.deadline) : null;
  const isMahasiswa = role === 'mahasiswa';
  const isUMKM = role === 'umkm';
  const escrowHeld = transaction?.status_escrow === 'held';
  const escrowReleased = transaction?.status_escrow === 'released';

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-navy-700 transition-colors"><ArrowLeft size={16} /> Kembali ke Pekerjaan Saya</button>

      {/* Contract Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={STATUS_COLORS[project.status]}>{STATUS_LABELS[project.status]}</span>
              {project.dispute_status === 'open' && <span className="badge-red">Sengketa Aktif</span>}
            </div>
            <h1 className="text-xl font-bold text-navy-800">{project.judul}</h1>
            <p className="text-sm text-gray-500 mt-1">{otherName}</p>
          </div>
          <Button variant="outline" onClick={() => onOpenChat(project.id, otherId, otherName)}><MessageCircle size={18} /> Chat</Button>
        </div>

        {/* Contract Details Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
          <div>
            <div className="text-xs text-gray-400 mb-1">Harga Disepakati</div>
            <div className="text-lg font-bold text-emerald-600">{formatRupiah(project.harga_disepakati || project.budget || 0)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Deadline</div>
            <div className="text-sm font-medium text-navy-700">{project.deadline ? new Date(project.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Tidak ditentukan'}</div>
            {deadlineLeft && <div className={`text-xs mt-0.5 ${deadlineLeft.urgent ? 'text-red-500' : 'text-gray-400'}`}>{deadlineLeft.text}</div>}
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Kategori</div>
            <div className="text-sm font-medium text-navy-700">{project.kategori || 'Lainnya'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Layanan</div>
            <div className="text-sm font-medium text-navy-700 capitalize">{project.layanan_type}</div>
          </div>
        </div>

        {project.scope_of_work && (
          <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="text-xs font-semibold text-navy-700 mb-1">Scope of Work</div>
            <p className="text-sm text-gray-600">{project.scope_of_work}</p>
          </div>
        )}
      </div>

      {/* Escrow Tracker */}
      {transaction && (
        <div className={`card p-5 ${escrowHeld ? 'border-emerald-200 bg-emerald-50/50' : escrowReleased ? 'border-navy-200 bg-navy-50/50' : ''}`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${escrowHeld ? 'bg-emerald-100' : 'bg-navy-100'}`}>
              <Shield size={24} className={escrowHeld ? 'text-emerald-600' : 'text-navy-600'} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-navy-800">Escrow Tracker</h3>
              <p className="text-sm text-gray-500">
                {escrowHeld && `Dana ${formatRupiah(transaction.amount)} aman di Escrow. Mahasiswa tenang, dana sudah dijamin.`}
                {escrowReleased && `Dana ${formatRupiah(transaction.net_to_mahasiswa)} telah dilepas ke mahasiswa.`}
                {transaction.status_escrow === 'refunded' && `Dana telah dikembalikan ke UMKM.`}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Status</div>
              <div className={`text-sm font-semibold capitalize ${escrowHeld ? 'text-emerald-600' : escrowReleased ? 'text-navy-600' : 'text-gray-500'}`}>{transaction.status_escrow}</div>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Submit Work - Mahasiswa only, when in_progress or revision */}
        {isMahasiswa && (project.status === 'in_progress' || project.status === 'revision') && (
          <button onClick={() => setShowSubmit(true)} className="card card-hover p-5 text-left">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3"><Upload size={20} className="text-emerald-600" /></div>
            <h3 className="font-semibold text-navy-800 text-sm">Kirim Hasil Kerja</h3>
            <p className="text-xs text-gray-500 mt-1">Upload file hasil pengerjaan</p>
          </button>
        )}

        {/* Review & Approve - UMKM only, when review status */}
        {isUMKM && project.status === 'review' && (
          <>
            <button onClick={() => setShowReview(true)} className="card card-hover p-5 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3"><CheckCircle2 size={20} className="text-emerald-600" /></div>
              <h3 className="font-semibold text-navy-800 text-sm">Setujui & Selesai</h3>
              <p className="text-xs text-gray-500 mt-1">Terima hasil, beri rating, cairkan dana</p>
            </button>
            <button onClick={() => setShowRevision(true)} className="card card-hover p-5 text-left">
              <div className="w-10 h-10 rounded-xl bg-sunshine-50 flex items-center justify-center mb-3"><AlertTriangle size={20} className="text-sunshine-600" /></div>
              <h3 className="font-semibold text-navy-800 text-sm">Minta Revisi</h3>
              <p className="text-xs text-gray-500 mt-1">Minta perbaikan dengan catatan</p>
            </button>
          </>
        )}

        {/* Dispute SOS Button - both roles, when not completed/cancelled */}
        {project.status !== 'completed' && project.status !== 'cancelled' && project.dispute_status !== 'open' && (
          <button onClick={() => setShowDispute(true)} className="card card-hover p-5 text-left border-red-200 hover:border-red-400">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-3"><AlertTriangle size={20} className="text-red-500" /></div>
            <h3 className="font-semibold text-navy-800 text-sm">Laporkan Masalah</h3>
            <p className="text-xs text-gray-500 mt-1">Minta intervensi admin (SOS)</p>
          </button>
        )}
      </div>

      {/* Revision Notes */}
      {project.revision_notes && project.status === 'revision' && (
        <div className="card p-5 border-sunshine-200 bg-sunshine-50/30">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-sunshine-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-navy-800 text-sm">Catatan Revisi dari UMKM</h3>
              <p className="text-sm text-gray-600 mt-1">{project.revision_notes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Submitted Files */}
      {files.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-navy-800 mb-4">File Hasil Kerja</h3>
          <div className="space-y-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                <div className="w-9 h-9 rounded-lg bg-navy-100 flex items-center justify-center flex-shrink-0"><FileText size={18} className="text-navy-500" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-navy-800 truncate">{f.file_name}</div>
                  <div className="text-xs text-gray-400">{timeAgo(f.created_at)} {f.is_final_submission && '· Final Submission'}</div>
                </div>
                <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"><Download size={16} /></a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Dispute */}
      {dispute && (
        <div className="card p-5 border-red-200 bg-red-50/30">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-navy-800 text-sm">Sengketa Aktif</h3>
                <span className="badge-red text-xs capitalize">{dispute.status}</span>
              </div>
              <p className="text-sm font-medium text-navy-700">{dispute.reason}</p>
              {dispute.description && <p className="text-sm text-gray-500 mt-1">{dispute.description}</p>}
              {dispute.resolution_notes && <div className="mt-2 p-3 rounded-lg bg-white border border-gray-200"><div className="text-xs font-semibold text-navy-700">Resolusi Admin:</div><p className="text-sm text-gray-600 mt-1">{dispute.resolution_notes}</p></div>}
            </div>
          </div>
        </div>
      )}

      {/* Submit Work Modal */}
      <Modal open={showSubmit} onClose={() => { setShowSubmit(false); setSubmitFile(null); }} title="Kirim Hasil Kerja" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">File Hasil Kerja</label>
            {submitFile ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <FileText size={20} className="text-emerald-600" />
                <span className="text-sm font-medium text-navy-700 flex-1 truncate">{submitFile.name}</span>
                <button onClick={() => setSubmitFile(null)} className="text-red-400 hover:text-red-600"><XCircle size={18} /></button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all">
                <Upload size={24} className="text-gray-400" />
                <span className="text-sm text-gray-500">Klik untuk upload file</span>
                <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSubmitFile(f); }} />
              </label>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Catatan untuk UMKM (opsional)</label>
            <textarea value={submitNote} onChange={(e) => setSubmitNote(e.target.value)} placeholder="Jelaskan hasil kerja Anda..." rows={3} className="input-field resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setShowSubmit(false); setSubmitFile(null); }}>Batal</Button>
            <Button className="flex-1" loading={saving} onClick={submitWork} disabled={!submitFile}>Kirim Hasil</Button>
          </div>
        </div>
      </Modal>

      {/* Review & Approve Modal */}
      <Modal open={showReview} onClose={() => setShowReview(false)} title="Review & Setujui Hasil Kerja" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-2">Rating</label>
            <StarRating rating={reviewRating} size={28} onChange={setReviewRating} />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Komentar / Ulasan</label>
            <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Berikan ulasan untuk mahasiswa..." rows={3} className="input-field resize-none" />
          </div>
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2 text-sm text-emerald-700"><Shield size={16} /> Dana akan dilepas dari Escrow ke mahasiswa setelah Anda menekan "Setujui".</div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowReview(false)}>Batal</Button>
            <Button className="flex-1" loading={saving} onClick={approveAndComplete}>Setujui & Cairkan Dana</Button>
          </div>
        </div>
      </Modal>

      {/* Revision Modal */}
      <Modal open={showRevision} onClose={() => setShowRevision(false)} title="Minta Revisi" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Catatan Revisi</label>
            <textarea value={revisionNotes} onChange={(e) => setRevisionNotes(e.target.value)} placeholder="Jelaskan apa yang perlu diperbaiki..." rows={4} className="input-field resize-none" />
          </div>
          <div className="p-4 rounded-xl bg-sunshine-50 border border-sunshine-200">
            <div className="flex items-center gap-2 text-sm text-sunshine-700"><AlertTriangle size={16} /> Mahasiswa tidak bisa mencairkan dana sampai revisi selesai dan Anda menekan "Setujui".</div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowRevision(false)}>Batal</Button>
            <Button className="flex-1" loading={saving} onClick={requestRevision} disabled={!revisionNotes}>Kirim Revisi</Button>
          </div>
        </div>
      </Modal>

      {/* Dispute Modal */}
      <Modal open={showDispute} onClose={() => setShowDispute(false)} title="Laporkan Masalah (SOS)" size="md">
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-center gap-2 text-sm text-red-600"><AlertTriangle size={16} /> Admin akan mengintervensi proyek ini. Pastikan Anda sudah mencoba berkomunikasi dengan pihak lain.</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Alasan Laporan</label>
            <input type="text" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="Contoh: UMKM tidak merespons / Hasil kerja tidak sesuai" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Deskripsi Detail</label>
            <textarea value={disputeDesc} onChange={(e) => setDisputeDesc(e.target.value)} placeholder="Jelaskan masalah secara detail..." rows={4} className="input-field resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowDispute(false)}>Batal</Button>
            <Button className="flex-1" loading={saving} onClick={raiseDispute} disabled={!disputeReason}>Kirim Laporan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
