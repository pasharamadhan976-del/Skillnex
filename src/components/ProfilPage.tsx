import { useState, useEffect, useRef } from 'react';
import { Store, GraduationCap, Save, CheckCircle2, Clock, XCircle, Upload, FileText, Send, AlertCircle, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Button, Spinner } from './ui';
import type { VerifStatus, Document } from '../lib/types';

const VERIF_BADGES: Record<VerifStatus, { label: string; class: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'Menunggu Verifikasi', class: 'badge-sunshine', icon: Clock },
  interview: { label: 'Tahap Interview', class: 'badge-navy', icon: Clock },
  verified: { label: 'Terverifikasi', class: 'badge-emerald', icon: CheckCircle2 },
  active: { label: 'Aktif', class: 'badge-emerald', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', class: 'badge-red', icon: XCircle },
};

export function ProfilPage() {
  const { user, role, profileUmkm, profileMahasiswa, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [umkmForm, setUmkmForm] = useState({ nama_umkm: '', nama_pemilik: '', telepon: '', alamat: '', deskripsi: '', kategori_bisnis: '', layanan_type: 'basic' as 'basic' | 'priority', website: '' });
  const [mhsForm, setMhsForm] = useState({ nama_lengkap: '', telepon: '', universitas: '', jurusan: '', semester: '', deskripsi_diri: '', portofolio_link: '', tarif_per_proyek: '' });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (profileUmkm) {
      setUmkmForm({ nama_umkm: profileUmkm.nama_umkm || '', nama_pemilik: profileUmkm.nama_pemilik || '', telepon: profileUmkm.telepon || '', alamat: profileUmkm.alamat || '', deskripsi: profileUmkm.deskripsi || '', kategori_bisnis: profileUmkm.kategori_bisnis || '', layanan_type: profileUmkm.layanan_type || 'basic', website: profileUmkm.website || '' });
    }
    if (profileMahasiswa) {
      setMhsForm({ nama_lengkap: profileMahasiswa.nama_lengkap || '', telepon: profileMahasiswa.telepon || '', universitas: profileMahasiswa.universitas || '', jurusan: profileMahasiswa.jurusan || '', semester: profileMahasiswa.semester?.toString() || '', deskripsi_diri: profileMahasiswa.deskripsi_diri || '', portofolio_link: profileMahasiswa.portofolio_link || '', tarif_per_proyek: profileMahasiswa.tarif_per_proyek?.toString() || '' });
    }
    loadDocuments();
  }, [profileUmkm, profileMahasiswa]);

  async function loadDocuments() {
    if (!user) return;
    const { data } = await supabase.from('documents').select('*').eq('user_id', user.id);
    if (data) setDocuments(data as Document[]);
    setLoading(false);
  }

  async function saveUmkm() {
    if (!profileUmkm) return;
    setSaving(true);
    await (supabase.from('profiles_umkm') as any).update({
      nama_umkm: umkmForm.nama_umkm, nama_pemilik: umkmForm.nama_pemilik, telepon: umkmForm.telepon || null,
      alamat: umkmForm.alamat || null, deskripsi: umkmForm.deskripsi || null, kategori_bisnis: umkmForm.kategori_bisnis || null,
      layanan_type: umkmForm.layanan_type, website: umkmForm.website || null, updated_at: new Date().toISOString(),
    }).eq('id', profileUmkm.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function saveMhs() {
    if (!profileMahasiswa) return;
    setSaving(true);
    await (supabase.from('profiles_mahasiswa') as any).update({
      nama_lengkap: mhsForm.nama_lengkap, telepon: mhsForm.telepon || null, universitas: mhsForm.universitas || null,
      jurusan: mhsForm.jurusan || null, semester: mhsForm.semester ? parseInt(mhsForm.semester) : null,
      deskripsi_diri: mhsForm.deskripsi_diri || null, portofolio_link: mhsForm.portofolio_link || null,
      tarif_per_proyek: mhsForm.tarif_per_proyek ? parseFloat(mhsForm.tarif_per_proyek) : null,
      updated_at: new Date().toISOString(),
    }).eq('id', profileMahasiswa.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, docType: string) {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploadingDoc(docType);

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${docType}_${user.id}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file);

    let fileUrl: string;
    if (uploadError) {
      // Fallback: store file name only if storage fails
      console.error('Storage upload error:', uploadError);
      fileUrl = fileName;
    } else {
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
      fileUrl = urlData.publicUrl || fileName;
    }

    // Check if doc already exists
    const existing = documents.find((d) => d.doc_type === docType);
    if (existing) {
      await (supabase.from('documents') as any).update({ file_name: file.name, file_url: fileUrl, is_verified: false, rejection_reason: null }).eq('id', existing.id);
    } else {
      await (supabase.from('documents') as any).insert({ user_id: user.id, doc_type: docType, file_name: file.name, file_url: fileUrl, is_verified: false });
    }

    setUploadingDoc(null);
    e.target.value = '';
    loadDocuments();
  }

  async function submitForVerification() {
    if (!user) return;
    setSubmitting(true);
    const table = role === 'umkm' ? 'profiles_umkm' : 'profiles_mahasiswa';
    const profileId = role === 'umkm' ? profileUmkm?.id : profileMahasiswa?.id;
    if (!profileId) { setSubmitting(false); return; }
    await (supabase.from(table) as any).update({ status_verif: 'pending', rejection_reason: null }).eq('id', profileId);
    await refreshProfile();
    setSubmitting(false);
  }

  async function uploadPhoto(file: File) {
    if (!user) return;
    setUploadingPhoto(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `photo_${user.id}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('profile-photos').upload(fileName, file);
    if (error) { console.error('Photo upload error:', error); setUploadingPhoto(false); return; }
    const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(fileName);
    const photoUrl = urlData.publicUrl;
    if (role === 'umkm' && profileUmkm) {
      await (supabase.from('profiles_umkm') as any).update({ logo_url: photoUrl }).eq('id', profileUmkm.id);
    } else if (role === 'mahasiswa' && profileMahasiswa) {
      await (supabase.from('profiles_mahasiswa') as any).update({ foto_url: photoUrl }).eq('id', profileMahasiswa.id);
    }
    await refreshProfile();
    setUploadingPhoto(false);
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size={32} className="text-emerald-500" /></div>;

  const verifStatus = role === 'umkm' ? profileUmkm?.status_verif : profileMahasiswa?.status_verif;
  const verifBadge = verifStatus ? VERIF_BADGES[verifStatus] : null;
  const rejectionReason = role === 'umkm' ? profileUmkm?.rejection_reason : profileMahasiswa?.rejection_reason;
  const requiredDocs = role === 'umkm' ? ['KTP', 'NPWP'] : ['KTM', 'KTP', 'CV'];
  const allDocsUploaded = requiredDocs.every((doc) => documents.some((d) => d.doc_type === doc));
  const canSubmit = allDocsUploaded && verifStatus !== 'verified' && verifStatus !== 'active' && verifStatus !== 'pending';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Verification Status Banner */}
      {verifBadge && (
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <verifBadge.icon size={20} className={verifStatus === 'verified' || verifStatus === 'active' ? 'text-emerald-600' : verifStatus === 'rejected' ? 'text-red-500' : 'text-sunshine-600'} />
          </div>
          <div className="flex-1">
            <div className="font-medium text-navy-800">Status Akun</div>
            <span className={verifBadge.class}>{verifBadge.label}</span>
          </div>
        </div>
      )}

      {/* Rejection Reason */}
      {verifStatus === 'rejected' && rejectionReason && (
        <div className="card p-4 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-red-700 text-sm">Akun Ditolak</div>
              <p className="text-sm text-red-600 mt-1">{rejectionReason}</p>
              <p className="text-xs text-red-500 mt-2">Silakan perbaiki data dan unggah ulang dokumen, lalu ajukan verifikasi kembali.</p>
            </div>
          </div>
        </div>
      )}

      {role === 'umkm' ? (
        <>
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center"><Store size={24} className="text-emerald-600" /></div>
              <div><h2 className="text-lg font-semibold text-navy-800">Profil UMKM</h2><p className="text-sm text-gray-500">Lengkapi data UMKM Anda</p></div>
            </div>
            {/* Profile Photo */}
            <div className="flex items-center gap-4 mb-6">
              {profileUmkm?.logo_url ? (
                <img src={profileUmkm.logo_url} alt="Logo" className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-200" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center"><Store size={32} className="text-emerald-400" /></div>
              )}
              <div>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ''; }} />
                <Button variant="outline" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>
                  {uploadingPhoto ? <Spinner size={16} /> : <><Camera size={16} /> {profileUmkm?.logo_url ? 'Ganti Logo' : 'Upload Logo'}</>}
                </Button>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, max 5MB</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Nama UMKM</label><input type="text" value={umkmForm.nama_umkm} onChange={(e) => setUmkmForm({ ...umkmForm, nama_umkm: e.target.value })} className="input-field" placeholder="Toko Kopi Senja" /></div>
                <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Nama Pemilik</label><input type="text" value={umkmForm.nama_pemilik} onChange={(e) => setUmkmForm({ ...umkmForm, nama_pemilik: e.target.value })} className="input-field" placeholder="Joko Susilo" /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Telepon</label><input type="text" value={umkmForm.telepon} onChange={(e) => setUmkmForm({ ...umkmForm, telepon: e.target.value })} className="input-field" placeholder="08123456789" /></div>
                <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Kategori Bisnis</label><input type="text" value={umkmForm.kategori_bisnis} onChange={(e) => setUmkmForm({ ...umkmForm, kategori_bisnis: e.target.value })} className="input-field" placeholder="Kuliner" /></div>
              </div>
              <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Alamat</label><input type="text" value={umkmForm.alamat} onChange={(e) => setUmkmForm({ ...umkmForm, alamat: e.target.value })} className="input-field" placeholder="Jl. Merdeka No. 1, Jakarta" /></div>
              <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Website (opsional)</label><input type="text" value={umkmForm.website} onChange={(e) => setUmkmForm({ ...umkmForm, website: e.target.value })} className="input-field" placeholder="https://tokokopisenja.com" /></div>
              <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Deskripsi UMKM</label><textarea value={umkmForm.deskripsi} onChange={(e) => setUmkmForm({ ...umkmForm, deskripsi: e.target.value })} rows={3} className="input-field resize-none" placeholder="Jelaskan tentang UMKM Anda..." /></div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Tipe Layanan</label>
                <select value={umkmForm.layanan_type} onChange={(e) => setUmkmForm({ ...umkmForm, layanan_type: e.target.value as 'basic' | 'priority' })} className="input-field cursor-pointer">
                  <option value="basic">Basic (Komisi 5% per proyek)</option>
                  <option value="priority">Priority (Komisi 10% per proyek)</option>
                </select>
                <div className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 space-y-1">
                  {umkmForm.layanan_type === 'basic' ? (
                    <>
                      <div className="font-medium text-navy-700 mb-1">Yang Anda dapatkan (Basic):</div>
                      <div>- Akses marketplace talenta mahasiswa</div>
                      <div>- Chat & negosiasi langsung dengan talenta</div>
                      <div>- Sistem pembayaran aman (Escrow)</div>
                      <div>- Posting lowongan tanpa batas</div>
                      <div>- Review & rating talenta</div>
                      <div>- Dukungan tiket bantuan (respons 2x24 jam)</div>
                    </>
                  ) : (
                    <>
                      <div className="font-medium text-navy-700 mb-1">Yang Anda dapatkan (Priority):</div>
                      <div>- Semua fitur Basic, plus:</div>
                      <div>- Prioritas matching talenta terverifikasi</div>
                      <div>- Badge "Priority UMKM" di profil</div>
                      <div>- Talenta rekomendasi pilihan admin</div>
                      <div>- Dukungan prioritas (respons 1x24 jam)</div>
                      <div>- Mediasi dispute oleh admin khusus</div>
                      <div>- Laporan performa & analitik dashboard</div>
                    </>
                  )}
                </div>
              </div>
              <Button onClick={saveUmkm} loading={saving} className="w-full">{saved ? <><CheckCircle2 size={18} /> Tersimpan!</> : <><Save size={18} /> Simpan Profil</>}</Button>
            </div>
          </div>

          {/* Document Upload */}
          <div className="card p-6">
            <h3 className="font-semibold text-navy-800 mb-1">Dokumen Verifikasi</h3>
            <p className="text-sm text-gray-500 mb-4">Upload dokumen untuk verifikasi akun. Admin akan meninjau dokumen Anda.</p>
            <div className="space-y-3">
              {requiredDocs.map((doc) => {
                const uploaded = documents.find((d) => d.doc_type === doc);
                return (
                  <div key={doc} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-navy-800">{doc}</div>
                        <div className="text-xs text-gray-500">{uploaded ? (uploaded.is_verified ? 'Terverifikasi' : uploaded.rejection_reason ? `Ditolak: ${uploaded.rejection_reason}` : 'Menunggu verifikasi') : 'Belum diupload'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {uploaded?.is_verified ? <CheckCircle2 size={20} className="text-emerald-500" /> : uploaded && !uploaded.is_verified ? <Clock size={20} className="text-sunshine-500" /> : null}
                      <input ref={(el) => { fileInputRefs.current[doc] = el; }} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileUpload(e, doc)} />
                      <Button variant="outline" className="!px-3 !py-1.5 !text-xs" onClick={() => fileInputRefs.current[doc]?.click()} disabled={uploadingDoc === doc}>
                        {uploadingDoc === doc ? <Spinner size={14} /> : <><Upload size={14} /> {uploaded ? 'Ulangi' : 'Upload'}</>}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {canSubmit && (
              <Button className="w-full mt-4" onClick={submitForVerification} loading={submitting}><Send size={18} /> Ajukan Verifikasi</Button>
            )}
            {!allDocsUploaded && verifStatus !== 'verified' && verifStatus !== 'active' && (
              <p className="text-xs text-gray-400 text-center mt-3">Upload semua dokumen untuk mengajukan verifikasi.</p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center"><GraduationCap size={24} className="text-emerald-600" /></div>
              <div><h2 className="text-lg font-semibold text-navy-800">Profil Mahasiswa</h2><p className="text-sm text-gray-500">Lengkapi data profil Anda</p></div>
            </div>
            {/* Profile Photo */}
            <div className="flex items-center gap-4 mb-6">
              {profileMahasiswa?.foto_url ? (
                <img src={profileMahasiswa.foto_url} alt="Foto" className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-200" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center"><GraduationCap size={32} className="text-emerald-400" /></div>
              )}
              <div>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ''; }} />
                <Button variant="outline" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>
                  {uploadingPhoto ? <Spinner size={16} /> : <><Camera size={16} /> {profileMahasiswa?.foto_url ? 'Ganti Foto' : 'Upload Foto'}</>}
                </Button>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, max 5MB</p>
              </div>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Nama Lengkap</label><input type="text" value={mhsForm.nama_lengkap} onChange={(e) => setMhsForm({ ...mhsForm, nama_lengkap: e.target.value })} className="input-field" placeholder="Sari Wijaya" /></div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Telepon</label><input type="text" value={mhsForm.telepon} onChange={(e) => setMhsForm({ ...mhsForm, telepon: e.target.value })} className="input-field" placeholder="08123456789" /></div>
                <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Semester</label><input type="number" value={mhsForm.semester} onChange={(e) => setMhsForm({ ...mhsForm, semester: e.target.value })} className="input-field" placeholder="5" /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Universitas</label><input type="text" value={mhsForm.universitas} onChange={(e) => setMhsForm({ ...mhsForm, universitas: e.target.value })} className="input-field" placeholder="Universitas Indonesia" /></div>
                <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Jurusan</label><input type="text" value={mhsForm.jurusan} onChange={(e) => setMhsForm({ ...mhsForm, jurusan: e.target.value })} className="input-field" placeholder="Ilmu Komputer" /></div>
              </div>
              <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Tarif per Proyek (Rp)</label><input type="number" value={mhsForm.tarif_per_proyek} onChange={(e) => setMhsForm({ ...mhsForm, tarif_per_proyek: e.target.value })} className="input-field" placeholder="500000" /></div>
              <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Deskripsi Diri</label><textarea value={mhsForm.deskripsi_diri} onChange={(e) => setMhsForm({ ...mhsForm, deskripsi_diri: e.target.value })} rows={3} className="input-field resize-none" placeholder="Jelaskan tentang diri Anda dan keahlian Anda..." /></div>
              <div><label className="block text-sm font-medium text-navy-700 mb-1.5">Link Portofolio Eksternal (opsional)</label><input type="text" value={mhsForm.portofolio_link} onChange={(e) => setMhsForm({ ...mhsForm, portofolio_link: e.target.value })} className="input-field" placeholder="https://behance.net/username" /></div>
              <Button onClick={saveMhs} loading={saving} className="w-full">{saved ? <><CheckCircle2 size={18} /> Tersimpan!</> : <><Save size={18} /> Simpan Profil</>}</Button>
            </div>
          </div>

          {/* Document Upload */}
          <div className="card p-6">
            <h3 className="font-semibold text-navy-800 mb-1">Dokumen Verifikasi</h3>
            <p className="text-sm text-gray-500 mb-4">Upload dokumen untuk verifikasi akun. Admin akan meninjau dokumen Anda.</p>
            <div className="space-y-3">
              {requiredDocs.map((doc) => {
                const uploaded = documents.find((d) => d.doc_type === doc);
                return (
                  <div key={doc} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-navy-800">{doc}</div>
                        <div className="text-xs text-gray-500">{uploaded ? (uploaded.is_verified ? 'Terverifikasi' : uploaded.rejection_reason ? `Ditolak: ${uploaded.rejection_reason}` : 'Menunggu verifikasi') : 'Belum diupload'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {uploaded?.is_verified ? <CheckCircle2 size={20} className="text-emerald-500" /> : uploaded && !uploaded.is_verified ? <Clock size={20} className="text-sunshine-500" /> : null}
                      <input ref={(el) => { fileInputRefs.current[doc] = el; }} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileUpload(e, doc)} />
                      <Button variant="outline" className="!px-3 !py-1.5 !text-xs" onClick={() => fileInputRefs.current[doc]?.click()} disabled={uploadingDoc === doc}>
                        {uploadingDoc === doc ? <Spinner size={14} /> : <><Upload size={14} /> {uploaded ? 'Ulangi' : 'Upload'}</>}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {canSubmit && (
              <Button className="w-full mt-4" onClick={submitForVerification} loading={submitting}><Send size={18} /> Ajukan Verifikasi</Button>
            )}
            {!allDocsUploaded && verifStatus !== 'verified' && verifStatus !== 'active' && (
              <p className="text-xs text-gray-400 text-center mt-3">Upload semua dokumen untuk mengajukan verifikasi.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
