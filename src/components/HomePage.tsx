import { useState, useEffect } from 'react';
import {
  Briefcase, Wallet, MessageCircle, Star, Clock,
  ArrowRight, Sparkles, Search, GraduationCap,
  Shield, ChevronRight, Phone, X, Store, Award,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Spinner, Button } from './ui';
import { Modal } from './Modal';
import { StarRating } from './StarRating';
import {
  STATUS_LABELS, STATUS_COLORS, formatRupiah,
  SPESIALIS_TO_KATEGORI, KATEGORI_INDUK,
  type Project, type ProfileMahasiswa, type Skill, type Review, type Portfolio,
} from '../lib/types';
import { getInitials, timeAgo } from '../lib/helpers';
import type { DashboardPage } from './DashboardLayout';

interface HomePageProps {
  onNavigate: (page: DashboardPage) => void;
  onOpenChat: (projectId: string, receiverId: string, receiverName: string) => void;
  onOfferProject: (mahasiswaUserId: string, mahasiswaId: string, mahasiswaName: string) => void;
}

interface TalentData {
  profile: ProfileMahasiswa;
  skills: Skill[];
  portfolios: Portfolio[];
  reviews: Review[];
  avgRating: number;
  projectCount: number;
}

const UMKM_BANNER = 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1920';
const MHS_BANNER = 'https://images.pexels.com/photos/7681091/pexels-photo-7681091.jpeg?auto=compress&cs=tinysrgb&w=1920';

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: typeof Briefcase; color: string }) {
  return (
    <div className="card p-5">
      <div className={'w-10 h-10 rounded-xl flex items-center justify-center mb-3 ' + color}><Icon size={20} /></div>
      <div className="text-xl lg:text-2xl font-bold text-navy-800 truncate">{value}</div>
      <div className="text-xs lg:text-sm text-gray-500">{label}</div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, desc, color, onClick }: { icon: typeof Briefcase; title: string; desc: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card card-hover p-5 text-left">
      <div className={'w-10 h-10 rounded-xl flex items-center justify-center mb-3 ' + color}><Icon size={20} /></div>
      <h3 className="font-semibold text-navy-800 mb-1 text-sm">{title}</h3>
      <p className="text-xs text-gray-500">{desc}</p>
    </button>
  );
}

export function HomePage({ onNavigate, onOpenChat, onOfferProject }: HomePageProps) {
  const { user, role, profileUmkm, profileMahasiswa } = useAuth();
  const [loading, setLoading] = useState(true);
  const [talents, setTalents] = useState<TalentData[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [kategoriFilter, setKategoriFilter] = useState('');
  const [showAllKategori, setShowAllKategori] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState<TalentData | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, earnings: 0, escrow: 0 });

  useEffect(() => { loadAll(); }, [user]);

  async function loadAll() {
    if (!user) return;
    setLoading(true);
    await Promise.all([loadTalents(), loadMyProjects()]);
    setLoading(false);
  }

  async function loadTalents() {
    const { data: profiles } = await supabase.from('profiles_mahasiswa').select('*').eq('status_verif', 'verified').order('created_at', { ascending: false }).limit(20);
    if (!profiles) { setTalents([]); return; }
    const list: TalentData[] = [];
    for (const p of profiles as ProfileMahasiswa[]) {
      const { data: skills } = await supabase.from('skills').select('*').eq('mahasiswa_id', p.id);
      const { data: ports } = await supabase.from('portfolios').select('*').eq('mahasiswa_id', p.id).order('created_at', { ascending: false }).limit(6);
      const { data: reviews } = await supabase.from('reviews').select('*').eq('mahasiswa_user_id', p.user_id).order('created_at', { ascending: false }).limit(5);
      const ratings = (reviews as Review[]) || [];
      const avg = ratings.length > 0 ? ratings.reduce((a, r) => a + r.rating, 0) / ratings.length : 0;
      list.push({ profile: p, skills: (skills as Skill[]) || [], portfolios: (ports as Portfolio[]) || [], reviews: ratings, avgRating: avg, projectCount: ratings.length });
    }
    setTalents(list);
  }

  async function loadMyProjects() {
    if (!user) return;
    const { data: projs } = await supabase.from('projects').select('*').or('umkm_user_id.eq.' + user.id + ',mahasiswa_user_id.eq.' + user.id).order('created_at', { ascending: false }).limit(5);
    const projectList = (projs as Project[]) || [];
    setMyProjects(projectList);
    let earnings = 0, escrow = 0;
    if (role === 'mahasiswa') {
      const { data: txs } = await supabase.from('transactions').select('net_to_mahasiswa').eq('mahasiswa_user_id', user.id).eq('status_escrow', 'released');
      earnings = ((txs as { net_to_mahasiswa: number }[]) || []).reduce((a, t) => a + (t.net_to_mahasiswa || 0), 0);
    }
    if (role === 'umkm') {
      const { data: txs } = await supabase.from('transactions').select('amount').eq('umkm_user_id', user.id).eq('status_escrow', 'held');
      escrow = ((txs as { amount: number }[]) || []).reduce((a, t) => a + (t.amount || 0), 0);
    }
    setStats({
      total: projectList.length,
      active: projectList.filter((p) => ['funded', 'in_progress', 'review', 'revision'].includes(p.status)).length,
      completed: projectList.filter((p) => p.status === 'completed').length,
      earnings,
      escrow,
    });
  }

  function handleKategoriClick(kat: string) {
    setKategoriFilter(kat);
    onNavigate('cari-talenta');
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size={32} className="text-emerald-500" /></div>;

  const displayName = role === 'umkm' ? (profileUmkm?.nama_umkm || 'UMKM') : (profileMahasiswa?.nama_lengkap || 'Mahasiswa');
  const displayFoto = role === 'umkm' ? profileUmkm?.logo_url : profileMahasiswa?.foto_url;
  const kategoriDisplay = showAllKategori ? KATEGORI_INDUK : KATEGORI_INDUK.slice(0, 8);

  // === UMKM HOMEPAGE ===
  if (role === 'umkm') {
    return (
      <div className="space-y-6">
        {/* UMKM Welcome Banner - Navy/Emerald theme */}
        <div className="relative overflow-hidden rounded-2xl">
          <img src={UMKM_BANNER} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-navy-900/95 via-navy-800/90 to-emerald-900/80" />
          <div className="relative p-6 lg:p-8 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {displayFoto ? (
                  <img src={displayFoto} alt={displayName} className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-xl font-semibold">{getInitials(displayName)}</div>
                )}
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-2">
                    <Store size={12} className="text-emerald-400" />
                    <span className="text-xs font-medium text-white/90">Dashboard UMKM</span>
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-bold">Halo, {displayName}!</h2>
                  <p className="text-white/60 text-sm max-w-lg mt-1">Temukan talenta mahasiswa terbaik dan tawarkan proyek langsung kepada mereka.</p>
                </div>
              </div>
              <div className="hidden sm:block"><Store size={48} className="text-white/20" /></div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Proyek" value={stats.total} icon={Briefcase} color="bg-navy-50 text-navy-600" />
          <StatCard label="Proyek Aktif" value={stats.active} icon={Clock} color="bg-sunshine-50 text-sunshine-600" />
          <StatCard label="Dana di Escrow" value={formatRupiah(stats.escrow)} icon={Wallet} color="bg-emerald-50 text-emerald-600" />
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction icon={Search} title="Cari Talenta" desc="Jelajahi marketplace" color="bg-emerald-50 text-emerald-600" onClick={() => onNavigate('cari-talenta')} />
          <QuickAction icon={Briefcase} title="Pekerjaan Saya" desc="Kelola pekerjaan aktif" color="bg-navy-50 text-navy-600" onClick={() => onNavigate('proyek-saya')} />
          <QuickAction icon={MessageCircle} title="Chat" desc="Komunikasi talenta" color="bg-sunshine-50 text-sunshine-600" onClick={() => onNavigate('chat')} />
          <QuickAction icon={Shield} title="Bantuan" desc="Hubungi admin" color="bg-red-50 text-red-500" onClick={() => onNavigate('bantuan')} />
        </div>

        {/* Kategori Talenta */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="font-semibold text-navy-800">Kategori Talenta</h3><p className="text-sm text-gray-500">Klik untuk filter talenta berdasarkan bidang</p></div>
            <Button variant="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => onNavigate('cari-talenta')}>Lihat Semua <ArrowRight size={14} /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {kategoriDisplay.map((kat) => {
              const isActive = kategoriFilter === kat;
              const cls = isActive ? 'bg-emerald-500 text-white' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-600';
              return <button key={kat} onClick={() => handleKategoriClick(kat)} className={'px-4 py-2 rounded-xl text-sm font-medium transition-all ' + cls}>{kat}</button>;
            })}
            {!showAllKategori && KATEGORI_INDUK.length > 8 && (
              <button onClick={() => setShowAllKategori(true)} className="px-4 py-2 rounded-xl text-sm font-medium bg-navy-50 text-navy-600 hover:bg-navy-100 transition-all flex items-center gap-1">Lihat Semua <ChevronRight size={14} /></button>
            )}
            {showAllKategori && (
              <button onClick={() => setShowAllKategori(false)} className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all flex items-center gap-1"><X size={14} /> Sembunyikan</button>
            )}
          </div>
        </div>

        {/* Recent Projects + Talents */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-navy-800">Pekerjaan Terbaru</h3>
              <Button variant="ghost" className="!px-2 !py-1 !text-xs" onClick={() => onNavigate('proyek-saya')}>Lihat Semua <ArrowRight size={14} /></Button>
            </div>
            {myProjects.length === 0 ? <p className="text-sm text-gray-400 py-8 text-center">Belum ada pekerjaan. Cari talenta dan tawarkan proyek!</p> : (
              <div className="space-y-2">
                {myProjects.slice(0, 4).map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="flex-1 min-w-0"><div className="font-medium text-navy-800 text-sm truncate">{p.judul}</div><div className="text-xs text-gray-400">{timeAgo(p.created_at)}</div></div>
                    <span className={STATUS_COLORS[p.status]}>{STATUS_LABELS[p.status]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-navy-800">Talenta Terbaru</h3>
              <Button variant="ghost" className="!px-2 !py-1 !text-xs" onClick={() => onNavigate('cari-talenta')}>Lihat Semua <ArrowRight size={14} /></Button>
            </div>
            {talents.length === 0 ? <p className="text-sm text-gray-400 py-8 text-center">Belum ada talenta terverifikasi.</p> : (
              <div className="space-y-2">
                {talents.slice(0, 4).map((t) => {
                  const primarySkill = t.skills[0];
                  const kInduk = primarySkill ? (SPESIALIS_TO_KATEGORI[primarySkill.kategori] || primarySkill.kategori) : 'Talenta';
                  return (
                    <div key={t.profile.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:border-emerald-300" onClick={() => setSelectedTalent(t)}>
                      {t.profile.foto_url ? <img src={t.profile.foto_url} alt={t.profile.nama_lengkap} className="w-9 h-9 rounded-full object-cover flex-shrink-0" /> : <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-semibold text-emerald-700 flex-shrink-0">{getInitials(t.profile.nama_lengkap)}</div>}
                      <div className="flex-1 min-w-0"><div className="font-medium text-navy-800 text-sm truncate">{t.profile.nama_lengkap}</div><div className="text-xs text-gray-400 truncate">{primarySkill?.spesialis || kInduk}</div></div>
                      <div className="flex items-center gap-1 text-xs"><Star size={12} className="fill-sunshine-400 text-sunshine-400" />{t.avgRating > 0 ? t.avgRating.toFixed(1) : '-'}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <TalentDetailModal selectedTalent={selectedTalent} setSelectedTalent={setSelectedTalent} onOpenChat={onOpenChat} onOfferProject={onOfferProject} role={role} />
      </div>
    );
  }

  // === MAHASISWA HOMEPAGE ===
  return (
    <div className="space-y-6">
      {/* Mahasiswa Welcome Banner - Emerald/Sunshine theme */}
      <div className="relative overflow-hidden rounded-2xl">
        <img src={MHS_BANNER} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/95 via-emerald-800/90 to-sunshine-900/70" />
        <div className="relative p-6 lg:p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {displayFoto ? (
                <img src={displayFoto} alt={displayName} className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-sunshine-500 flex items-center justify-center text-xl font-semibold">{getInitials(displayName)}</div>
              )}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-2">
                  <GraduationCap size={12} className="text-sunshine-400" />
                  <span className="text-xs font-medium text-white/90">Dashboard Mahasiswa</span>
                </div>
                <h2 className="text-2xl lg:text-3xl font-bold">Halo, {displayName}!</h2>
                <p className="text-white/60 text-sm max-w-lg mt-1">Kelola keahlian Anda, terima penawaran proyek dari UMKM, dan bangun portofolio.</p>
              </div>
            </div>
            <div className="hidden sm:block"><GraduationCap size={48} className="text-white/20" /></div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Proyek" value={stats.total} icon={Briefcase} color="bg-navy-50 text-navy-600" />
        <StatCard label="Proyek Aktif" value={stats.active} icon={Clock} color="bg-sunshine-50 text-sunshine-600" />
        <StatCard label="Pendapatan" value={formatRupiah(stats.earnings)} icon={Wallet} color="bg-emerald-50 text-emerald-600" />
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickAction icon={Sparkles} title="Tawarkan Jasa" desc="Kelola skills" color="bg-navy-50 text-navy-600" onClick={() => onNavigate('tawarkan-jasa')} />
        <QuickAction icon={Briefcase} title="Pekerjaan Saya" desc="Lihat penawaran" color="bg-sunshine-50 text-sunshine-600" onClick={() => onNavigate('proyek-saya')} />
        <QuickAction icon={Wallet} title="Earning Hub" desc="Saldo & Penarikan" color="bg-emerald-50 text-emerald-600" onClick={() => onNavigate('earning')} />
        <QuickAction icon={Award} title="Portofolio" desc="Kelola karya" color="bg-navy-50 text-navy-600" onClick={() => onNavigate('portofolio')} />
      </div>

      {/* Profile Completion Banner */}
      {profileMahasiswa?.status_verif !== 'verified' && (
        <div className={'card p-5 ' + (profileMahasiswa?.status_verif === 'pending' ? 'bg-sunshine-50 border-sunshine-200' : 'bg-red-50 border-red-200')}>
          <div className="flex items-center gap-3">
            <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (profileMahasiswa?.status_verif === 'pending' ? 'bg-sunshine-100' : 'bg-red-100')}>
              <Shield size={20} className={profileMahasiswa?.status_verif === 'pending' ? 'text-sunshine-600' : 'text-red-500'} />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-navy-800 text-sm">
                {profileMahasiswa?.status_verif === 'pending' ? 'Verifikasi Sedang Diproses' : profileMahasiswa?.status_verif === 'rejected' ? 'Verifikasi Ditolak' : 'Lengkapi Profil Anda'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {profileMahasiswa?.status_verif === 'pending' ? 'Admin sedang memverifikasi akun Anda. Anda akan mendapat notifikasi saat selesai.' : 'Lengkapi profil dan upload dokumen verifikasi untuk mulai menerima penawaran proyek.'}
              </p>
            </div>
            <Button variant="outline" className="!text-xs" onClick={() => onNavigate('profil')}>Lengkapi</Button>
          </div>
        </div>
      )}

      {/* Recent Projects */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-navy-800">Pekerjaan Terbaru</h3>
          <Button variant="ghost" className="!px-2 !py-1 !text-xs" onClick={() => onNavigate('proyek-saya')}>Lihat Semua <ArrowRight size={14} /></Button>
        </div>
        {myProjects.length === 0 ? <p className="text-sm text-gray-400 py-8 text-center">Belum ada penawaran proyek. Lengkapi skills Anda agar UMKM dapat menemukan Anda!</p> : (
          <div className="space-y-2">
            {myProjects.slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex-1 min-w-0"><div className="font-medium text-navy-800 text-sm truncate">{p.judul}</div><div className="text-xs text-gray-400">{timeAgo(p.created_at)}</div></div>
                <span className={STATUS_COLORS[p.status]}>{STATUS_LABELS[p.status]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <TalentDetailModal selectedTalent={selectedTalent} setSelectedTalent={setSelectedTalent} onOpenChat={onOpenChat} onOfferProject={onOfferProject} role={role} />
    </div>
  );
}

function TalentDetailModal({ selectedTalent, setSelectedTalent, onOpenChat, onOfferProject, role }: {
  selectedTalent: TalentData | null;
  setSelectedTalent: (t: TalentData | null) => void;
  onOpenChat: (projectId: string, receiverId: string, receiverName: string) => void;
  onOfferProject: (mahasiswaUserId: string, mahasiswaId: string, mahasiswaName: string) => void;
  role: string | null;
}) {
  return (
    <Modal open={!!selectedTalent} onClose={() => setSelectedTalent(null)} title="Profil Talenta" size="lg">
      {selectedTalent && (
        <div>
          <div className="flex items-start gap-4 mb-6">
            {selectedTalent.profile.foto_url ? <img src={selectedTalent.profile.foto_url} alt={selectedTalent.profile.nama_lengkap} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" /> : <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl font-semibold text-emerald-700 flex-shrink-0">{getInitials(selectedTalent.profile.nama_lengkap)}</div>}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-navy-800">{selectedTalent.profile.nama_lengkap}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1"><GraduationCap size={16} />{selectedTalent.profile.universitas}</div>
              {selectedTalent.profile.jurusan && <div className="text-sm text-gray-500 mt-0.5">{selectedTalent.profile.jurusan} - Semester {selectedTalent.profile.semester}</div>}
              <div className="flex items-center gap-3 mt-2"><StarRating rating={selectedTalent.avgRating} size={16} /><span className="text-sm font-medium text-navy-700">{selectedTalent.avgRating > 0 ? selectedTalent.avgRating.toFixed(1) : 'Belum ada rating'}</span><span className="text-sm text-gray-400">· {selectedTalent.projectCount} proyek</span></div>
              {selectedTalent.profile.tarif_per_proyek && <div className="mt-2 text-base font-semibold text-emerald-600">Tarif: Rp {selectedTalent.profile.tarif_per_proyek.toLocaleString('id-ID')} / proyek</div>}
            </div>
          </div>
          {selectedTalent.profile.deskripsi_diri && <div className="mb-6"><h3 className="text-sm font-semibold text-navy-700 mb-2">Tentang</h3><p className="text-sm text-gray-600 leading-relaxed">{selectedTalent.profile.deskripsi_diri}</p></div>}
          <div className="mb-6"><h3 className="text-sm font-semibold text-navy-700 mb-3">Keahlian</h3><div className="flex flex-wrap gap-2">{selectedTalent.skills.map((s) => { const kInduk = SPESIALIS_TO_KATEGORI[s.kategori] || s.kategori; return (<div key={s.id} className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">{s.spesialis && <div className="text-sm font-medium text-emerald-700">{s.spesialis}</div>}<div className={'text-xs text-emerald-600 ' + (s.spesialis ? 'mt-0.5' : 'text-sm font-medium text-emerald-700')}>{kInduk}</div>{s.deskripsi && <div className="text-xs text-gray-500 mt-0.5">{s.deskripsi}</div>}<div className="text-xs text-emerald-500 mt-0.5 capitalize">Tingkat: {s.tingkat}</div></div>); })}</div></div>
          {selectedTalent.portfolios.length > 0 && <div className="mb-6"><h3 className="text-sm font-semibold text-navy-700 mb-3">Portofolio</h3><div className="grid grid-cols-2 gap-3">{selectedTalent.portfolios.map((p) => (<div key={p.id} className="rounded-xl bg-gray-50 border border-gray-200 overflow-hidden">{p.image_url ? <div className="h-28 overflow-hidden"><img src={p.image_url} alt={p.judul} className="w-full h-full object-cover" /></div> : <div className="h-20 bg-gradient-to-br from-emerald-100 to-navy-100 flex items-center justify-center"><Briefcase size={24} className="text-emerald-300" /></div>}<div className="p-3"><div className="font-medium text-navy-800 text-sm">{p.judul}</div>{p.deskripsi && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{p.deskripsi}</div>}</div></div>))}</div></div>}
          {selectedTalent.reviews.length > 0 && <div className="mb-6"><h3 className="text-sm font-semibold text-navy-700 mb-3">Ulasan ({selectedTalent.reviews.length})</h3><div className="space-y-3">{selectedTalent.reviews.map((r) => (<div key={r.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200"><div className="flex items-center justify-between mb-2"><StarRating rating={r.rating} size={14} /><span className="text-xs text-gray-400">{timeAgo(r.created_at)}</span></div>{r.komentar && <p className="text-sm text-gray-600">{r.komentar}</p>}</div>))}</div></div>}
          {selectedTalent.profile.telepon && <div className="mb-6 p-4 rounded-xl bg-navy-50 border border-navy-100"><h3 className="text-sm font-semibold text-navy-700 mb-2">Cara Menghubungi</h3><div className="flex items-center gap-2 text-sm text-gray-600"><Phone size={16} className="text-navy-500" />{selectedTalent.profile.telepon}</div></div>}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            {role === 'umkm' ? (<><Button className="flex-1" onClick={() => { setSelectedTalent(null); onOfferProject(selectedTalent.profile.user_id, selectedTalent.profile.id, selectedTalent.profile.nama_lengkap); }}>Tawarkan Pekerjaan</Button><Button variant="outline" onClick={() => { setSelectedTalent(null); onOpenChat('', selectedTalent.profile.user_id, selectedTalent.profile.nama_lengkap); }}><MessageCircle size={18} /> Chat</Button></>) : (<Button variant="outline" className="flex-1" onClick={() => { setSelectedTalent(null); onOpenChat('', selectedTalent.profile.user_id, selectedTalent.profile.nama_lengkap); }}><MessageCircle size={18} /> Chat</Button>)}
          </div>
        </div>
      )}
    </Modal>
  );
}
