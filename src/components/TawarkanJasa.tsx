import { useState, useEffect } from 'react';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Button, EmptyState, Spinner } from './ui';
import { Modal } from './Modal';
import { KATEGORI_INDUK, SPESIALIS_TO_KATEGORI, type Skill } from '../lib/types';

const SPESIALIS_OPTIONS = Object.keys(SPESIALIS_TO_KATEGORI);

export function TawarkanJasa() {
  const { profileMahasiswa } = useAuth();
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkill, setNewSkill] = useState<{ kategori: string; spesialis: string; deskripsi: string; tingkat: 'pemula' | 'menengah' | 'mahir' }>({ kategori: '', spesialis: '', deskripsi: '', tingkat: 'menengah' });
  const [availableSpesialis, setAvailableSpesialis] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (profileMahasiswa) loadData(); }, [profileMahasiswa]);

  async function loadData() {
    if (!profileMahasiswa) return;
    setLoading(true);
    const { data: sk } = await supabase.from('skills').select('*').eq('mahasiswa_id', profileMahasiswa.id);
    setSkills((sk as Skill[]) || []);
    setLoading(false);
  }

  async function addSkill() {
    if (!profileMahasiswa || !newSkill.kategori) return;
    setSaving(true);
    await (supabase.from('skills') as any).insert({ mahasiswa_id: profileMahasiswa.id, kategori: newSkill.spesialis || newSkill.kategori, spesialis: newSkill.spesialis || null, deskripsi: newSkill.deskripsi || null, tingkat: newSkill.tingkat });
    setNewSkill({ kategori: '', spesialis: '', deskripsi: '', tingkat: 'menengah' });
    setShowAddSkill(false);
    setSaving(false);
    loadData();
  }

  async function deleteSkill(id: string) {
    await supabase.from('skills').delete().eq('id', id);
    loadData();
  }

  function handleKategoriChange(kategori: string) {
    setNewSkill({ ...newSkill, kategori, spesialis: '' });
    const specs = SPESIALIS_OPTIONS.filter((s) => SPESIALIS_TO_KATEGORI[s] === kategori);
    setAvailableSpesialis(specs);
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size={32} className="text-emerald-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="card p-5 bg-emerald-50 border-emerald-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0"><Sparkles size={20} className="text-emerald-600" /></div>
          <div>
            <h3 className="font-semibold text-navy-800">Tawarkan Talenta Anda</h3>
            <p className="text-sm text-gray-600 mt-1">Lengkapi keahlian Anda agar UMKM dapat menemukan dan menawarkan proyek kepada Anda.</p>
          </div>
        </div>
      </div>

      {/* Skills Section */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-navy-800">Keahlian / Skills</h2>
            <p className="text-sm text-gray-500">Pilih kategori dan spesialisasi yang Anda kuasai</p>
          </div>
          <Button onClick={() => setShowAddSkill(true)}><Plus size={18} /> Tambah Skill</Button>
        </div>
        {skills.length === 0 ? (
          <EmptyState icon={<Sparkles size={28} />} title="Belum ada skill" description="Tambahkan keahlian Anda agar UMKM dapat menemukan Anda di marketplace." action={<Button onClick={() => setShowAddSkill(true)}><Plus size={18} />Tambah Skill Pertama</Button>} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {skills.map((s) => {
              const kInduk = SPESIALIS_TO_KATEGORI[s.kategori] || s.kategori;
              return (
                <div key={s.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200 group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {s.spesialis && <div className="font-semibold text-navy-800">{s.spesialis}</div>}
                      <div className={`text-sm text-gray-500 ${s.spesialis ? 'mt-0.5' : 'font-medium text-navy-800'}`}>{kInduk}</div>
                      {s.deskripsi && <div className="text-sm text-gray-500 mt-1">{s.deskripsi}</div>}
                      <span className="badge-navy text-xs mt-2 capitalize">{s.tingkat}</span>
                    </div>
                    <button onClick={() => deleteSkill(s.id)} className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Skill Modal */}
      <Modal open={showAddSkill} onClose={() => setShowAddSkill(false)} title="Tambah Keahlian" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Kategori Talenta</label>
            <select value={newSkill.kategori} onChange={(e) => handleKategoriChange(e.target.value)} className="input-field cursor-pointer">
              <option value="">Pilih kategori...</option>
              {KATEGORI_INDUK.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          {availableSpesialis.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Spesialisasi <span className="text-gray-400 font-normal">(opsional)</span></label>
              <select value={newSkill.spesialis} onChange={(e) => setNewSkill({ ...newSkill, spesialis: e.target.value })} className="input-field cursor-pointer">
                <option value="">Pilih spesialisasi...</option>
                {availableSpesialis.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">Pilih spesifik dari kategori yang Anda kuasai</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Tingkat Keahlian</label>
            <select value={newSkill.tingkat} onChange={(e) => setNewSkill({ ...newSkill, tingkat: e.target.value as 'pemula' | 'menengah' | 'mahir' })} className="input-field cursor-pointer">
              <option value="pemula">Pemula</option>
              <option value="menengah">Menengah</option>
              <option value="mahir">Mahir</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Deskripsi (opsional)</label>
            <textarea value={newSkill.deskripsi} onChange={(e) => setNewSkill({ ...newSkill, deskripsi: e.target.value })} placeholder="Jelaskan keahlian Anda..." rows={3} className="input-field resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAddSkill(false)}>Batal</Button>
            <Button className="flex-1" loading={saving} onClick={addSkill} disabled={!newSkill.kategori}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
