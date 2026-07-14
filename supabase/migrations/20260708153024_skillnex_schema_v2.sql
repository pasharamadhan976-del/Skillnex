/*
# Skillnex Schema V2 - Perbaikan & Penambahan Kolom

Menambahkan kolom-kolom yang diperlukan untuk mendukung alur 32 langkah:
- UMKM: terms_agreed, registration_step
- Mahasiswa: terms_agreed, registration_step, foto_url (fix), sertifikat
- Projects: counter_offer, notes_revision
- Tambah policy agar UMKM bisa baca profil mahasiswa verified untuk marketplace
*/

-- Tambah kolom registrasi UMKM
ALTER TABLE profiles_umkm
  ADD COLUMN IF NOT EXISTS terms_agreed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_step int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS website text;

-- Tambah kolom registrasi Mahasiswa  
ALTER TABLE profiles_mahasiswa
  ADD COLUMN IF NOT EXISTS terms_agreed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_step int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tarif_per_proyek decimal(15,2),
  ADD COLUMN IF NOT EXISTS total_proyek int DEFAULT 0;

-- Tambah kolom proyek untuk negosiasi lebih detail
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS counter_offer decimal(15,2),
  ADD COLUMN IF NOT EXISTS revision_notes text,
  ADD COLUMN IF NOT EXISTS completion_notes text,
  ADD COLUMN IF NOT EXISTS is_umkm_reviewed boolean DEFAULT false;

-- Tambah kolom transaksi
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_proof text;

-- Policy agar UMKM bisa melihat profil mahasiswa verified di marketplace
DROP POLICY IF EXISTS "umkm_read_verified_mhs" ON profiles_mahasiswa;
CREATE POLICY "umkm_read_verified_mhs" ON profiles_mahasiswa FOR SELECT
  TO authenticated USING (status_verif = 'verified' OR auth.uid() = user_id);

-- Policy agar mahasiswa bisa lihat profil UMKM yang menawarkan proyek
DROP POLICY IF EXISTS "mhs_read_umkm_profile" ON profiles_umkm;
CREATE POLICY "mhs_read_umkm_profile" ON profiles_umkm FOR SELECT
  TO authenticated USING (true);

-- Policy agar UMKM bisa lihat skills mahasiswa verified
DROP POLICY IF EXISTS "skill_select_all" ON skills;
CREATE POLICY "skill_select_all" ON skills FOR SELECT
  TO authenticated USING (true);

-- Policy agar semua bisa lihat portofolio
DROP POLICY IF EXISTS "port_select_all" ON portfolios;
CREATE POLICY "port_select_all" ON portfolios FOR SELECT
  TO authenticated USING (true);

-- Policy agar review bisa dilihat semua (untuk reputasi)
DROP POLICY IF EXISTS "rev_select_all" ON reviews;
CREATE POLICY "rev_select_all" ON reviews FOR SELECT
  TO authenticated USING (true);

-- Notifications bisa diinsert oleh siapapun (untuk cross-user notifikasi)
DROP POLICY IF EXISTS "notif_insert_own" ON notifications;
CREATE POLICY "notif_insert_any" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);
