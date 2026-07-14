/*
# Skillnex V8 - Add spesialis to skills, portfolio image upload, reviews display

1. Add spesialis column to skills (e.g., "Desain UI/UX" while kategori is "Teknologi & IT")
2. Add image_url to portfolios for file upload
3. Add RLS for reading reviews (already exists, but verify)
4. Add portfolio_images storage bucket
*/

-- ============ Add spesialis to skills ============
ALTER TABLE skills ADD COLUMN IF NOT EXISTS spesialis text;
COMMENT ON COLUMN skills.spesialis IS 'Specific specialty within the category, e.g. "Desain UI/UX" for kategori "Teknologi & IT"';

-- ============ Add image_url to portfolios ============
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS image_url text;

-- ============ Create portfolio_images storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-images', 'portfolio-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for portfolio-images bucket
CREATE POLICY "portimg_upload_own" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'portfolio-images' AND auth.uid() = owner);

CREATE POLICY "portimg_read_all" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'portfolio-images');

-- ============ Add RLS for reviews SELECT (public read) ============
DROP POLICY IF EXISTS "review_read_all" ON reviews;
CREATE POLICY "review_read_all" ON reviews FOR SELECT
  TO anon, authenticated USING (true);

-- ============ Add RLS for portfolios SELECT (public read) ============
DROP POLICY IF EXISTS "port_read_all" ON portfolios;
CREATE POLICY "port_read_all" ON portfolios FOR SELECT
  TO anon, authenticated USING (true);

-- ============ Add RLS for skills SELECT (public read) ============
DROP POLICY IF EXISTS "skill_read_all" ON skills;
CREATE POLICY "skill_read_all" ON skills FOR SELECT
  TO anon, authenticated USING (true);

-- ============ Add portfolio UPDATE/DELETE for own ============
DROP POLICY IF EXISTS "port_update_own" ON portfolios;
CREATE POLICY "port_update_own" ON portfolios FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles_mahasiswa pm WHERE pm.id = portfolios.mahasiswa_id AND pm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "port_delete_own" ON portfolios;
CREATE POLICY "port_delete_own" ON portfolios FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles_mahasiswa pm WHERE pm.id = portfolios.mahasiswa_id AND pm.user_id = auth.uid())
  );
