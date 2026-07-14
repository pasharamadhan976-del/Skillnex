/*
# Skillnex Marketplace Schema - Initial Setup

## Overview
Membuat schema database untuk Skillnex, marketplace talenta yang menghubungkan UMKM dengan Mahasiswa.
Sistem mencakup: autentikasi, profil UMKM & Mahasiswa, portofolio, skills, projects, transaksi escrow,
chat, notifikasi, rating/review, dan audit log.

## Tables Created
1. profiles_umkm - Profil UMKM dengan tipe layanan (basic 5% / priority 10%)
2. profiles_mahasiswa - Profil Mahasiswa dengan status verifikasi
3. documents - Dokumen verifikasi (KTP, KTM, NPWP, CV)
4. skills - Skills/kategori talenta mahasiswa
5. projects - Project antara UMKM dan Mahasiswa dengan workflow lengkap
6. portfolios - Portofolio mahasiswa (bertambah otomatis setelah project selesai)
7. transactions - Transaksi pembayaran dengan escrow, komisi, handling fee
8. messages - Chat antara UMKM dan Mahasiswa
9. notifications - Notifikasi untuk berbagai event
10. reviews - Rating dan ulasan dari UMKM ke Mahasiswa
11. audit_logs - Log untuk tracking aksi admin

## Security
- RLS diaktifkan pada semua tabel
- Owner-scoped policies menggunakan auth.uid()
*/

-- ============ PROFILES UMKM ============
CREATE TABLE IF NOT EXISTS profiles_umkm (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_umkm text NOT NULL,
  nama_pemilik text NOT NULL,
  telepon text,
  alamat text,
  deskripsi text,
  layanan_type text NOT NULL DEFAULT 'basic' CHECK (layanan_type IN ('basic', 'priority')),
  status_verif text NOT NULL DEFAULT 'pending' CHECK (status_verif IN ('pending', 'active', 'rejected')),
  logo_url text,
  kategori_bisnis text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles_umkm ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "umkm_select_own" ON profiles_umkm;
CREATE POLICY "umkm_select_own" ON profiles_umkm FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "umkm_insert_own" ON profiles_umkm;
CREATE POLICY "umkm_insert_own" ON profiles_umkm FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "umkm_update_own" ON profiles_umkm;
CREATE POLICY "umkm_update_own" ON profiles_umkm FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "umkm_delete_own" ON profiles_umkm;
CREATE POLICY "umkm_delete_own" ON profiles_umkm FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ PROFILES MAHASISWA ============
CREATE TABLE IF NOT EXISTS profiles_mahasiswa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_lengkap text NOT NULL,
  telepon text,
  universitas text,
  jurusan text,
  semester int,
  deskripsi_diri text,
  status_verif text NOT NULL DEFAULT 'pending' CHECK (status_verif IN ('pending', 'interview', 'verified', 'rejected')),
  foto_url text,
  portofolio_link text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles_mahasiswa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mhs_select_own" ON profiles_mahasiswa;
CREATE POLICY "mhs_select_own" ON profiles_mahasiswa FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "mhs_insert_own" ON profiles_mahasiswa;
CREATE POLICY "mhs_insert_own" ON profiles_mahasiswa FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "mhs_update_own" ON profiles_mahasiswa;
CREATE POLICY "mhs_update_own" ON profiles_mahasiswa FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "mhs_delete_own" ON profiles_mahasiswa;
CREATE POLICY "mhs_delete_own" ON profiles_mahasiswa FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ DOCUMENTS ============
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('KTP', 'KTM', 'NPWP', 'CV', 'PORTOFOLIO')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  is_verified boolean DEFAULT false,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_select_own" ON documents;
CREATE POLICY "doc_select_own" ON documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "doc_insert_own" ON documents;
CREATE POLICY "doc_insert_own" ON documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "doc_delete_own" ON documents;
CREATE POLICY "doc_delete_own" ON documents FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ SKILLS ============
CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mahasiswa_id uuid NOT NULL REFERENCES profiles_mahasiswa(id) ON DELETE CASCADE,
  kategori text NOT NULL,
  deskripsi text,
  tingkat text DEFAULT 'menengah' CHECK (tingkat IN ('pemula', 'menengah', 'mahir')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skill_select_all" ON skills;
CREATE POLICY "skill_select_all" ON skills FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "skill_insert_own" ON skills;
CREATE POLICY "skill_insert_own" ON skills FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles_mahasiswa WHERE profiles_mahasiswa.id = skills.mahasiswa_id AND profiles_mahasiswa.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "skill_delete_own" ON skills;
CREATE POLICY "skill_delete_own" ON skills FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles_mahasiswa WHERE profiles_mahasiswa.id = skills.mahasiswa_id AND profiles_mahasiswa.user_id = auth.uid())
  );

-- ============ PROJECTS ============
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  umkm_id uuid NOT NULL REFERENCES profiles_umkm(id) ON DELETE CASCADE,
  mahasiswa_id uuid REFERENCES profiles_mahasiswa(id) ON DELETE SET NULL,
  umkm_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mahasiswa_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  judul text NOT NULL,
  deskripsi text NOT NULL,
  kategori text,
  budget decimal(15,2),
  harga_disepakati decimal(15,2),
  deadline date,
  status text NOT NULL DEFAULT 'negotiation' CHECK (status IN (
    'negotiation', 'funded', 'in_progress', 'review', 'revision', 'completed', 'cancelled'
  )),
  layanan_type text DEFAULT 'basic' CHECK (layanan_type IN ('basic', 'priority')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proj_select_participants" ON projects;
CREATE POLICY "proj_select_participants" ON projects FOR SELECT
  TO authenticated USING (auth.uid() = umkm_user_id OR auth.uid() = mahasiswa_user_id);

DROP POLICY IF EXISTS "proj_insert_umkm" ON projects;
CREATE POLICY "proj_insert_umkm" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = umkm_user_id);

DROP POLICY IF EXISTS "proj_update_participants" ON projects;
CREATE POLICY "proj_update_participants" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = umkm_user_id OR auth.uid() = mahasiswa_user_id)
  WITH CHECK (auth.uid() = umkm_user_id OR auth.uid() = mahasiswa_user_id);

-- ============ PORTFOLIOS ============
CREATE TABLE IF NOT EXISTS portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mahasiswa_id uuid NOT NULL REFERENCES profiles_mahasiswa(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  judul text NOT NULL,
  deskripsi text,
  kategori text,
  rating int CHECK (rating >= 1 AND rating <= 5),
  is_from_project boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "port_select_all" ON portfolios;
CREATE POLICY "port_select_all" ON portfolios FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "port_insert_own" ON portfolios;
CREATE POLICY "port_insert_own" ON portfolios FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles_mahasiswa WHERE profiles_mahasiswa.id = portfolios.mahasiswa_id AND profiles_mahasiswa.user_id = auth.uid())
  );

-- ============ TRANSACTIONS ============
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  umkm_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mahasiswa_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount decimal(15,2) NOT NULL,
  komisi_skillnex decimal(15,2) DEFAULT 0,
  handling_fee decimal(15,2) DEFAULT 0,
  net_to_mahasiswa decimal(15,2) DEFAULT 0,
  metode_pembayaran text CHECK (metode_pembayaran IN ('qris', 'transfer', 'e-wallet')),
  status_escrow text NOT NULL DEFAULT 'held' CHECK (status_escrow IN ('held', 'released', 'refunded')),
  payment_ref text,
  paid_at timestamptz,
  released_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tx_select_participants" ON transactions;
CREATE POLICY "tx_select_participants" ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = umkm_user_id OR auth.uid() = mahasiswa_user_id);

DROP POLICY IF EXISTS "tx_insert_umkm" ON transactions;
CREATE POLICY "tx_insert_umkm" ON transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = umkm_user_id);

DROP POLICY IF EXISTS "tx_update_participants" ON transactions;
CREATE POLICY "tx_update_participants" ON transactions FOR UPDATE
  TO authenticated USING (auth.uid() = umkm_user_id OR auth.uid() = mahasiswa_user_id)
  WITH CHECK (auth.uid() = umkm_user_id OR auth.uid() = mahasiswa_user_id);

-- ============ MESSAGES ============
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msg_select_participants" ON messages;
CREATE POLICY "msg_select_participants" ON messages FOR SELECT
  TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "msg_insert_sender" ON messages;
CREATE POLICY "msg_insert_sender" ON messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "msg_update_own" ON messages;
CREATE POLICY "msg_update_own" ON messages FOR UPDATE
  TO authenticated USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select_own" ON notifications;
CREATE POLICY "notif_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_insert_own" ON notifications;
CREATE POLICY "notif_insert_own" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_update_own" ON notifications;
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_delete_own" ON notifications;
CREATE POLICY "notif_delete_own" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ REVIEWS ============
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  umkm_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mahasiswa_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  komentar text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rev_select_participants" ON reviews;
CREATE POLICY "rev_select_participants" ON reviews FOR SELECT
  TO authenticated USING (auth.uid() = umkm_user_id OR auth.uid() = mahasiswa_user_id);

DROP POLICY IF EXISTS "rev_insert_umkm" ON reviews;
CREATE POLICY "rev_insert_umkm" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = umkm_user_id);

-- ============ AUDIT LOGS ============
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_performed text NOT NULL,
  target_id uuid,
  target_table text,
  details text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_all" ON audit_logs;
CREATE POLICY "audit_select_all" ON audit_logs FOR SELECT
  TO authenticated USING (true);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_profiles_umkm_user ON profiles_umkm(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_mhs_user ON profiles_mahasiswa(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_umkm ON projects(umkm_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_mhs ON projects(mahasiswa_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_project ON transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_skills_mhs ON skills(mahasiswa_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_mhs ON portfolios(mahasiswa_id);
