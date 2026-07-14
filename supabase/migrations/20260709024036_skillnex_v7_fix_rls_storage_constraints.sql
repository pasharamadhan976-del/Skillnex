/*
# Skillnex V7 - Fix critical RLS, storage, and constraint issues

1. Add INSERT policy on profiles_umkm (was missing - UMKM registration broken)
2. Create documents storage bucket
3. Add storage policies for documents bucket
4. Add 'disputed' to projects status constraint
5. Add default for projects.layanan_type
6. Fix projects INSERT RLS to allow umkm to set layanan_type
*/

-- ============ FIX: profiles_umkm INSERT policy ============
DROP POLICY IF EXISTS "umkm_insert_own" ON profiles_umkm;
CREATE POLICY "umkm_insert_own" ON profiles_umkm FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ FIX: Create documents storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents bucket
CREATE POLICY "doc_upload_own" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'documents' AND auth.uid() = owner);

CREATE POLICY "doc_read_own" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'documents' AND auth.uid() = owner);

CREATE POLICY "doc_read_public" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'documents' AND owner IS NOT NULL);

-- ============ FIX: projects status constraint - add 'disputed' ============
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status = ANY (ARRAY['negotiation'::text, 'funded'::text, 'in_progress'::text, 'review'::text, 'revision'::text, 'completed'::text, 'cancelled'::text, 'disputed'::text]));

-- ============ FIX: projects.layanan_type default ============
ALTER TABLE projects ALTER COLUMN layanan_type SET DEFAULT 'basic';

-- ============ FIX: projects INSERT RLS - allow UMKM to insert ============
DROP POLICY IF EXISTS "proj_insert_umkm" ON projects;
CREATE POLICY "proj_insert_umkm" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = umkm_user_id);

-- ============ FIX: transactions INSERT RLS ============
DROP POLICY IF EXISTS "tx_insert_umkm" ON transactions;
CREATE POLICY "tx_insert_umkm" ON transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = umkm_user_id);

-- ============ FIX: reviews INSERT RLS ============
DROP POLICY IF EXISTS "review_insert_umkm" ON reviews;
CREATE POLICY "review_insert_umkm" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = umkm_user_id);

-- ============ FIX: portfolios INSERT RLS ============
DROP POLICY IF EXISTS "port_insert_mhs" ON portfolios;
CREATE POLICY "port_insert_mhs" ON portfolios FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles_mahasiswa WHERE profiles_mahasiswa.user_id = auth.uid())
  );

-- ============ FIX: skills INSERT/UPDATE/DELETE RLS ============
DROP POLICY IF EXISTS "skill_insert_own" ON skills;
CREATE POLICY "skill_insert_own" ON skills FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles_mahasiswa pm WHERE pm.id = skills.mahasiswa_id AND pm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "skill_update_own" ON skills;
CREATE POLICY "skill_update_own" ON skills FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles_mahasiswa pm WHERE pm.id = skills.mahasiswa_id AND pm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "skill_delete_own" ON skills;
CREATE POLICY "skill_delete_own" ON skills FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles_mahasiswa pm WHERE pm.id = skills.mahasiswa_id AND pm.user_id = auth.uid())
  );

-- ============ FIX: messages INSERT RLS ============
DROP POLICY IF EXISTS "msg_insert_own" ON messages;
CREATE POLICY "msg_insert_own" ON messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);

-- ============ FIX: notifications INSERT RLS ============
DROP POLICY IF EXISTS "notif_insert" ON notifications;
CREATE POLICY "notif_insert" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============ FIX: support_tickets INSERT RLS ============
DROP POLICY IF EXISTS "ticket_insert_own" ON support_tickets;
CREATE POLICY "ticket_insert_own" ON support_tickets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ FIX: ticket_messages INSERT RLS ============
DROP POLICY IF EXISTS "tmsg_insert_own" ON ticket_messages;
CREATE POLICY "tmsg_insert_own" ON ticket_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);
