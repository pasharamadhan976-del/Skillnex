import { useState, useEffect } from 'react';
import { Star, Briefcase, Award, Plus, Upload, X, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Button, EmptyState, Spinner } from './ui';
import { Modal } from './Modal';
import { StarRating } from './StarRating';
import { KATEGORI_SKILLS, type Portfolio, type Review } from '../lib/types';
import { timeAgo } from '../lib/helpers';

export function PortofolioPage() {
  const { user, profileMahasiswa } = useAuth();
  const [loading, setLoading] = useState(true);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({ totalProjects: 0, avgRating: 0, totalRating: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [newPort, setNewPort] = useState({ judul: '', deskripsi: '', kategori: '' });
  const [portFile, setPortFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (profileMahasiswa) loadData(); }, [profileMahasiswa]);

  async function loadData() {
    if (!profileMahasiswa || !user) return;
    setLoading(true);
    const { data: ports } = await supabase.from('portfolios').select('*').eq('mahasiswa_id', profileMahasiswa.id).order('created_at', { ascending: false });
    const { data: revs } = await supabase.from('reviews').select('*').eq('mahasiswa_user_id', user.id).order('created_at', { ascending: false });
    const reviewList = (revs as Review[]) || [];
    const avg = reviewList.length > 0 ? reviewList.reduce((a, r) => a + r.rating, 0) / reviewList.length : 0;
    setPortfolios((ports as Portfolio[]) || []);
    setReviews(reviewList);
    setStats({ totalProjects: reviewList.length, avgRating: avg, totalRating: reviewList.length });
    setLoading(false);
  }

  async function uploadImage(file: File): Promise<string | null> {
    const fileExt = file.name.split('.').pop();
    const fileName = `portfolio_${profileMahasiswa?.id}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('portfolio-images').upload(fileName, file);
    if (error) { console.error('Upload error:', error); return null; }
    const { data } = supabase.storage.from('portfolio-images').getPublicUrl(fileName);
    return data.publicUrl || null;
  }

  async function addPortfolio() {
    if (!profileMahasiswa || !newPort.judul) return;
    setSaving(true);
    let imageUrl: string | null = null;
    if (portFile) imageUrl = await uploadImage(portFile);
    await (supabase.from('portfolios') as any).insert({ mahasiswa_id: profileMahasiswa.id, judul: newPort.judul, deskripsi: newPort.deskripsi || null, kategori: newPort.kategori || null, image_url: imageUrl, is_from_project: false });
    setNewPort({ judul: '', deskripsi: '', kategori: '' });
    setPortFile(null);
    setShowAdd(false);
    setSaving(false);
    loadData();
  }

  async function deletePortfolio(id: string) {
    await supabase.from('portfolios').delete().eq('id', id);
    loadData();
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size={32} className="text-emerald-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3"><Briefcase size={20} className="text-emerald-600" /></div>
          <div className="text-2xl font-bold text-navy-800">{stats.totalProjects}</div>
          <div className="text-sm text-gray-500">Proyek Selesai</div>
        </div>
        <div className="card p-5">
          <div className="w-10 h-10 rounded-xl bg-sunshine-50 flex items-center justify-center mb-3"><Star size={20} className="text-sunshine-600" /></div>
          <div className="text-2xl font-bold text-navy-800">{stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'N/A'}</div>
          <div className="text-sm text-gray-500">Rating Rata-rata</div>
        </div>
        <div className="card p-5">
          <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center mb-3"><Award size={20} className="text-navy-600" /></div>
          <div className="text-2xl font-bold text-navy-800">{portfolios.length}</div>
          <div className="text-sm text-gray-500">Total Portofolio</div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-navy-800">Portofolio Saya</h2>
          <Button onClick={() => setShowAdd(true)}><Plus size={18} /> Tambah</Button>
        </div>
        {portfolios.length === 0 ? (
          <EmptyState icon={<Briefcase size={28} />} title="Belum Ada Portofolio" description="Tambahkan karya Anda, atau portofolio akan bertambah otomatis setiap kali Anda menyelesaikan proyek." action={<Button onClick={() => setShowAdd(true)}><Plus size={18} />Tambah Portofolio</Button>} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolios.map((p) => (
              <div key={p.id} className="rounded-xl bg-gray-50 border border-gray-200 overflow-hidden group">
                {p.image_url ? (
                  <div className="h-40 overflow-hidden"><img src={p.image_url} alt={p.judul} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /></div>
                ) : (
                  <div className="h-32 bg-gradient-to-br from-emerald-100 to-navy-100 flex items-center justify-center"><Briefcase size={32} className="text-emerald-300" /></div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <h3 className="font-medium text-navy-800 text-sm">{p.judul}</h3>
                      {p.is_from_project && <span className="badge-emerald text-xs flex-shrink-0">Proyek</span>}
                    </div>
                    {!p.is_from_project && <button onClick={() => deletePortfolio(p.id)} className="p-1 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"><Trash2 size={14} /></button>}
                  </div>
                  {p.deskripsi && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.deskripsi}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    {p.kategori && <span className="badge-gray text-xs">{p.kategori}</span>}
                    {p.rating && <div className="flex items-center gap-1"><StarRating rating={p.rating} size={14} /><span className="text-xs text-gray-500">{p.rating}</span></div>}
                    <span className="text-xs text-gray-400 ml-auto">{timeAgo(p.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Portfolio Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setPortFile(null); }} title="Tambah Portofolio" size="md">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Judul Karya</label><input type="text" value={newPort.judul} onChange={(e) => setNewPort({ ...newPort, judul: e.target.value })} placeholder="Contoh: Desain Logo Cafe" className="input-field" /></div>
          <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Kategori</label><select value={newPort.kategori} onChange={(e) => setNewPort({ ...newPort, kategori: e.target.value })} className="input-field cursor-pointer"><option value="">Pilih...</option>{KATEGORI_SKILLS.map((k) => <option key={k} value={k}>{k}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Deskripsi</label><textarea value={newPort.deskripsi} onChange={(e) => setNewPort({ ...newPort, deskripsi: e.target.value })} placeholder="Jelaskan karya Anda..." rows={4} className="input-field resize-none" /></div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Gambar Karya (opsional)</label>
            {portFile ? (
              <div className="relative"><img src={URL.createObjectURL(portFile)} alt="Preview" className="w-full h-40 object-cover rounded-xl" /><button onClick={() => setPortFile(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"><X size={16} /></button></div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"><Upload size={24} className="text-gray-400" /><span className="text-sm text-gray-500">Klik untuk upload gambar</span><span className="text-xs text-gray-400">JPG, PNG, WebP</span><input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPortFile(f); }} /></label>
            )}
          </div>
          <div className="flex gap-3 pt-2"><Button variant="outline" className="flex-1" onClick={() => { setShowAdd(false); setPortFile(null); }}>Batal</Button><Button className="flex-1" loading={saving} onClick={addPortfolio} disabled={!newPort.judul}>Simpan</Button></div>
        </div>
      </Modal>

      {reviews.length > 0 && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-navy-800 mb-4">Ulasan dari UMKM</h2>
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <StarRating rating={r.rating} size={16} />
                  <span className="text-xs text-gray-400">{timeAgo(r.created_at)}</span>
                </div>
                {r.komentar && <p className="text-sm text-gray-600">"{r.komentar}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
