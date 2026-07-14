/*
# Skillnex V5 - Fix project application & dual completion

1. Add is_umkm_confirmed and is_mhs_confirmed to projects for dual "Selesai" confirmation
2. Add project_applications table for mahasiswa to apply to UMKM job postings
3. Fix documents RLS - allow users to insert their own documents
*/

-- Dual confirmation columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_umkm_confirmed boolean DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_mhs_confirmed boolean DEFAULT false;

-- Project applications table (mahasiswa applies to open job postings)
CREATE TABLE IF NOT EXISTS project_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  mahasiswa_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  mahasiswa_id uuid NOT NULL REFERENCES profiles_mahasiswa(id) ON DELETE CASCADE,
  pitch text,
  proposed_price decimal(15,2),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_applications ENABLE ROW LEVEL SECURITY;

-- UMKM can see applications to their projects
DROP POLICY IF EXISTS "app_select_umkm" ON project_applications;
CREATE POLICY "app_select_umkm" ON project_applications FOR SELECT
  TO authenticated USING (
    auth.uid() IN (SELECT umkm_user_id FROM projects WHERE id = project_id)
    OR auth.uid() = mahasiswa_user_id
  );

-- Mahasiswa can insert their own application
DROP POLICY IF EXISTS "app_insert_mhs" ON project_applications;
CREATE POLICY "app_insert_mhs" ON project_applications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = mahasiswa_user_id);

-- UMKM can update (accept/reject) applications to their projects
DROP POLICY IF EXISTS "app_update_umkm" ON project_applications;
CREATE POLICY "app_update_umkm" ON project_applications FOR UPDATE
  TO authenticated USING (
    auth.uid() IN (SELECT umkm_user_id FROM projects WHERE id = project_id)
  );

-- Fix documents RLS - users can insert their own documents
DROP POLICY IF EXISTS "doc_insert_own" ON documents;
CREATE POLICY "doc_insert_own" ON documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "doc_select_own" ON documents;
CREATE POLICY "doc_select_own" ON documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_app_project ON project_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_app_mhs ON project_applications(mahasiswa_user_id);
