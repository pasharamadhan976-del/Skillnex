/*
# Skillnex V4 - Fix verification constraints & marketplace RLS

1. Fix UMKM status_verif constraint to include 'verified' and 'interview'
2. Update RLS so ALL authenticated users can browse verified mahasiswa profiles (marketplace)
3. Update RLS so ALL authenticated users can browse UMKM profiles
4. Allow all authenticated users to read projects (for marketplace job browsing)
*/

-- Fix UMKM constraint to include 'verified' and 'interview'
ALTER TABLE profiles_umkm DROP CONSTRAINT IF EXISTS profiles_umkm_status_verif_check;
ALTER TABLE profiles_umkm ADD CONSTRAINT profiles_umkm_status_verif_check 
  CHECK (status_verif = ANY (ARRAY['pending'::text, 'interview'::text, 'verified'::text, 'active'::text, 'rejected'::text]));

-- Drop old marketplace RLS policies
DROP POLICY IF EXISTS "umkm_read_verified_mhs" ON profiles_mahasiswa;
DROP POLICY IF EXISTS "mhs_read_umkm_profile" ON profiles_umkm;

-- ALL authenticated users can read verified mahasiswa profiles (marketplace browsing)
CREATE POLICY "all_read_verified_mhs" ON profiles_mahasiswa FOR SELECT
  TO authenticated USING (status_verif = 'verified' OR auth.uid() = user_id);

-- ALL authenticated users can read UMKM profiles (marketplace browsing)
CREATE POLICY "all_read_umkm_profile" ON profiles_umkm FOR SELECT
  TO authenticated USING (true);

-- ALL authenticated users can read projects (for job marketplace browsing)
DROP POLICY IF EXISTS "all_read_projects" ON projects;
CREATE POLICY "all_read_projects" ON projects FOR SELECT
  TO authenticated USING (true);
