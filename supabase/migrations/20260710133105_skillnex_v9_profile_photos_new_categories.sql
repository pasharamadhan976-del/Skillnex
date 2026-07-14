-- Add foto_url to profiles_umkm (mahasiswa already has foto_url)
ALTER TABLE profiles_umkm ADD COLUMN IF NOT EXISTS logo_url text;

-- Add new kategori skills to the skill list
-- These are application-level constants, but we also add them to any master_categories table if it exists
INSERT INTO master_categories (name, is_active)
SELECT * FROM (VALUES
  ('Pendidikan', true),
  ('Jasa & Keterampilan', true),
  ('Event & Hospitality', true),
  ('Support & Operasional', true)
) AS v(name, is_active)
ON CONFLICT DO NOTHING;

-- Add storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile-photos bucket
CREATE POLICY "photo_upload_own" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'profile-photos' AND auth.uid() = owner);

CREATE POLICY "photo_read_all" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'profile-photos');
