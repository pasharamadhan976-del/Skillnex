import { useState, useEffect } from 'react';
import { Search, Star, Briefcase, GraduationCap, Filter, MessageCircle, Eye, X, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button, EmptyState, Spinner } from './ui';
import { Modal } from './Modal';
import { StarRating } from './StarRating';
import { SPESIALIS_TO_KATEGORI, KATEGORI_INDUK, type ProfileMahasiswa, type Skill, type Portfolio, type Review } from '../lib/types';
import { getInitials, timeAgo } from '../lib/helpers';

interface CariTalentaProps {
  onOpenChat: (projectId: string, receiverId: string, receiverName: string) => void;
  onOfferProject: (mahasiswaUserId: string, mahasiswaId: string, mahasiswaName: string) => void;
}

interface TalentData {
  profile: ProfileMahasiswa;
  skills: Skill[];
  portfolios: Portfolio[];
  reviews: (Review & { umkmName?: string })[];
  avgRating: number;
  projectCount: number;
}

export function CariTalenta({ onOpenChat, onOfferProject }: CariTalentaProps) {
  const [loading, setLoading] = useState(true);
  const [talents, setTalents] = useState<TalentData[]>([]);
  const [filtered, setFiltered] = useState<TalentData[]>([]);
  const [search, setSearch] = useState('');
  const [activeKategori, setActiveKategori] = useState<string>('');
  const [activeSpesialis, setActiveSpesialis] = useState<string>('');
  const [selectedTalent, setSelectedTalent] = useState<TalentData | null>(null);

  useEffect(() => { loadTalents(); }, []);

  async function loadTalents() {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles_mahasiswa').select('*').eq('status_verif', 'verified').order('created_at', { ascending: false });
    if (!profiles || profiles.length === 0) { setTalents([]); setFiltered([]); setLoading(false); return; }

    const talentList: TalentData[] = [];
    for (const p of profiles as ProfileMahasiswa[]) {
      const { data: skills } = await supabase.from('skills').select('*').eq('mahasiswa_id', p.id);
      const { data: ports } = await supabase.from('portfolios').select('*').eq('mahasiswa_id', p.id).order('created_at', { ascending: false }).limit(6);
      const { data: reviews } = await supabase.from('reviews').select('*').eq('mahasiswa_user_id', p.user_id).order('created_at', { ascending: false }).limit(5);
      const ratings = (reviews as Review[]) || [];
      const avg = ratings.length > 0 ? ratings.reduce((a, r) => a + r.rating, 0) / ratings.length : 0;
      talentList.push({ profile: p, skills: (skills as Skill[]) || [], portfolios: (ports as Portfolio[]) || [], reviews: ratings.map((r) => ({ ...r })), avgRating: avg, projectCount: ratings.length });
    }
    setTalents(talentList);
    setFiltered(talentList);
    setLoading(false);
  }

  useEffect(() => {
    let result = talents;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        t.profile.nama_lengkap.toLowerCase().includes(q) ||
        t.profile.universitas?.toLowerCase().includes(q) ||
        t.skills.some((s) => (s.spesialis || s.kategori).toLowerCase().includes(q))
      );
    }
    if (activeKategori) result = result.filter((t) => t.skills.some((s) => SPESIALIS_TO_KATEGORI[s.kategori] === activeKategori || s.kategori === activeKategori));
    if (activeSpesialis) result = result.filter((t) => t.skills.some((s) => s.spesialis === activeSpesialis));
    setFiltered(result);
  }, [search, activeKategori, activeSpesialis, talents]);

  // Build available spesialis list for active kategori
  const availableSpesialis = Array.from(new Set(
    talents.flatMap((t) => t.skills.filter((s) => !activeKategori || SPESIALIS_TO_KATEGORI[s.kategori] === activeKategori || s.kategori === activeKategori).map((s) => s.spesialis).filter(Boolean)
  ))) as string[];

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size={32} className="text-emerald-500" /></div>;

  return (
    <div>
      {/* Search Bar */}
      <div className="card p-4 mb-5">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, universitas, atau skill..." className="input-field pl-11" />
        </div>
      </div>

      {/* Kategori Induk Pills - Clickable */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Kategori</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setActiveKategori(''); setActiveSpesialis(''); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${!activeKategori ? 'bg-emerald-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-300'}`}
          >
            Semua
          </button>
          {KATEGORI_INDUK.map((kat) => (
            <button
              key={kat}
              onClick={() => { setActiveKategori(activeKategori === kat ? '' : kat); setActiveSpesialis(''); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeKategori === kat ? 'bg-emerald-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-300'}`}
            >
              {kat}
            </button>
          ))}
        </div>
      </div>

      {/* Spesialis Pills - Clickable (only when kategori is selected) */}
      {activeKategori && availableSpesialis.length > 0 && (
        <div className="mb-5 animate-slide-down">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-600">Spesialisasi</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableSpesialis.map((sp) => (
              <button
                key={sp}
                onClick={() => setActiveSpesialis(activeSpesialis === sp ? '' : sp)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeSpesialis === sp ? 'bg-navy-700 text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'}`}
              >
                {sp}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active filter indicator */}
      {(activeKategori || activeSpesialis || search) && (
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
          <span>{filtered.length} talenta ditemukan</span>
          {(activeKategori || activeSpesialis) && (
            <button onClick={() => { setActiveKategori(''); setActiveSpesialis(''); }} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600">
              <X size={14} /> Reset filter
            </button>
          )}
        </div>
      )}

      {/* Talent Cards */}
      {filtered.length === 0 ? (
        <EmptyState icon={<Search size={28} />} title="Talenta Tidak Ditemukan" description="Coba kata kunci atau filter kategori yang berbeda." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((t) => {
            const primarySkill = t.skills[0];
            const kategoriInduk = primarySkill ? (SPESIALIS_TO_KATEGORI[primarySkill.kategori] || primarySkill.kategori) : 'Lainnya';
            return (
              <div key={t.profile.id} className="card card-hover overflow-hidden cursor-pointer" onClick={() => setSelectedTalent(t)}>
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    {t.profile.foto_url ? (
                      <img src={t.profile.foto_url} alt={t.profile.nama_lengkap} className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-lg font-semibold text-emerald-700 flex-shrink-0">{getInitials(t.profile.nama_lengkap)}</div>
                    )
                  }
                  <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-navy-800 truncate">{t.profile.nama_lengkap}</h3>
                      <p className="text-sm text-gray-500 truncate">{t.profile.universitas || 'Universitas'}</p>
                    </div>
                  </div>
                  {/* Spesialis + Kategori - clean separation */}
                  {primarySkill && (
                    <div className="mb-3 space-y-1">
                      {primarySkill.spesialis && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveSpesialis(primarySkill.spesialis!); }}
                          className="block text-left text-sm font-medium text-navy-700 hover:text-emerald-600 transition-colors"
                        >
                          {primarySkill.spesialis}
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveKategori(kategoriInduk); }}
                        className="block text-left text-xs text-gray-500 hover:text-emerald-600 transition-colors"
                      >
                        {kategoriInduk}
                      </button>
                    </div>
                  )}
                  {t.profile.deskripsi_diri && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{t.profile.deskripsi_diri}</p>}
                  {t.profile.tarif_per_proyek && <p className="text-sm font-semibold text-emerald-600 mb-3">Mulai dari Rp {t.profile.tarif_per_proyek.toLocaleString('id-ID')}</p>}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Star size={14} className="fill-sunshine-400 text-sunshine-400" />{t.avgRating > 0 ? t.avgRating.toFixed(1) : 'N/A'}</span>
                      <span className="flex items-center gap-1"><Briefcase size={14} />{t.projectCount} proyek</span>
                    </div>
                    <Button variant="outline" className="!px-3 !py-1.5 !text-xs" onClick={(e) => { e.stopPropagation(); setSelectedTalent(t); }}>
                      <Eye size={14} /> Profil
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Profile Detail Modal */}
      <Modal open={!!selectedTalent} onClose={() => setSelectedTalent(null)} title="Profil Talenta" size="lg">
        {selectedTalent && (
          <div>
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              {selectedTalent.profile.foto_url ? (
                <img src={selectedTalent.profile.foto_url} alt={selectedTalent.profile.nama_lengkap} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl font-semibold text-emerald-700 flex-shrink-0">{getInitials(selectedTalent.profile.nama_lengkap)}</div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-navy-800">{selectedTalent.profile.nama_lengkap}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1"><GraduationCap size={16} />{selectedTalent.profile.universitas}</div>
                {selectedTalent.profile.jurusan && <div className="text-sm text-gray-500 mt-0.5">{selectedTalent.profile.jurusan} - Semester {selectedTalent.profile.semester}</div>}
                <div className="flex items-center gap-3 mt-2">
                  <StarRating rating={selectedTalent.avgRating} size={16} />
                  <span className="text-sm font-medium text-navy-700">{selectedTalent.avgRating > 0 ? selectedTalent.avgRating.toFixed(1) : 'Belum ada rating'}</span>
                  <span className="text-sm text-gray-400">· {selectedTalent.projectCount} proyek selesai</span>
                </div>
                {selectedTalent.profile.tarif_per_proyek && (
                  <div className="mt-2 text-base font-semibold text-emerald-600">Tarif: Rp {selectedTalent.profile.tarif_per_proyek.toLocaleString('id-ID')} / proyek</div>
                )}
              </div>
            </div>

            {selectedTalent.profile.deskripsi_diri && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-navy-700 mb-2">Tentang</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{selectedTalent.profile.deskripsi_diri}</p>
              </div>
            )}

            {/* Skills with spesialis */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-navy-700 mb-3">Keahlian</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTalent.skills.map((s) => {
                  const kInduk = SPESIALIS_TO_KATEGORI[s.kategori] || s.kategori;
                  return (
                    <div key={s.id} className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                      {s.spesialis && <div className="text-sm font-medium text-emerald-700">{s.spesialis}</div>}
                      <div className={`text-xs text-emerald-600 ${s.spesialis ? 'mt-0.5' : 'text-sm font-medium text-emerald-700'}`}>{kInduk}</div>
                      {s.deskripsi && <div className="text-xs text-gray-500 mt-0.5">{s.deskripsi}</div>}
                      <div className="text-xs text-emerald-500 mt-0.5 capitalize">Tingkat: {s.tingkat}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Portfolios with images */}
            {selectedTalent.portfolios.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-navy-700 mb-3">Portofolio</h3>
                <div className="grid grid-cols-2 gap-3">
                  {selectedTalent.portfolios.map((p) => (
                    <div key={p.id} className="rounded-xl bg-gray-50 border border-gray-200 overflow-hidden">
                      {p.image_url ? (
                        <div className="h-28 overflow-hidden">
                          <img src={p.image_url} alt={p.judul} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-20 bg-gradient-to-br from-emerald-100 to-navy-100 flex items-center justify-center">
                          <Briefcase size={24} className="text-emerald-300" />
                        </div>
                      )}
                      <div className="p-3">
                        <div className="font-medium text-navy-800 text-sm">{p.judul}</div>
                        {p.deskripsi && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{p.deskripsi}</div>}
                        <div className="flex items-center gap-2 mt-2">
                          {p.kategori && <span className="badge-gray text-xs">{p.kategori}</span>}
                          {p.rating && <span className="flex items-center gap-1 text-xs"><Star size={12} className="fill-sunshine-400 text-sunshine-400" />{p.rating}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {selectedTalent.reviews.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-navy-700 mb-3">Ulasan ({selectedTalent.reviews.length})</h3>
                <div className="space-y-3">
                  {selectedTalent.reviews.map((r) => (
                    <div key={r.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <StarRating rating={r.rating} size={14} />
                        <span className="text-xs text-gray-400">{timeAgo(r.created_at)}</span>
                      </div>
                      {r.komentar && <p className="text-sm text-gray-600">{r.komentar}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Info */}
            {selectedTalent.profile.telepon && (
              <div className="mb-6 p-4 rounded-xl bg-navy-50 border border-navy-100">
                <h3 className="text-sm font-semibold text-navy-700 mb-2">Cara Menghubungi</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600"><Phone size={16} className="text-navy-500" />{selectedTalent.profile.telepon}</div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button className="flex-1" onClick={() => { setSelectedTalent(null); onOfferProject(selectedTalent.profile.user_id, selectedTalent.profile.id, selectedTalent.profile.nama_lengkap); }}>
                Tawarkan Pekerjaan
              </Button>
              <Button variant="outline" onClick={() => { setSelectedTalent(null); onOpenChat('', selectedTalent.profile.user_id, selectedTalent.profile.nama_lengkap); }}>
                <MessageCircle size={18} /> Chat
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
