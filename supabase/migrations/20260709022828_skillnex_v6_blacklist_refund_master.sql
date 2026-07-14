/*
# Skillnex V6 - Blacklist, Refund, Master Data, Dispute

1. blacklist table - block users from re-registering
2. refund_requests table - handle project cancellation refunds
3. master_categories table - admin-managed skill categories
4. Add rejection_reason to profiles_umkm & profiles_mahasiswa
5. Add dispute_status to projects
6. Add admin_notes to documents
*/

-- ============ BLACKLIST ============
CREATE TABLE IF NOT EXISTS blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  reason text NOT NULL,
  blocked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blacklist_admin_all" ON blacklist;
CREATE POLICY "blacklist_admin_all" ON blacklist FOR ALL
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- ============ REFUND REQUESTS ============
CREATE TABLE IF NOT EXISTS refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "refund_select_participants" ON refund_requests;
CREATE POLICY "refund_select_participants" ON refund_requests FOR SELECT
  TO authenticated USING (
    requested_by = auth.uid() OR
    EXISTS (SELECT 1 FROM projects WHERE projects.id = refund_requests.project_id AND (projects.umkm_user_id = auth.uid() OR projects.mahasiswa_user_id = auth.uid())) OR
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "refund_insert_own" ON refund_requests;
CREATE POLICY "refund_insert_own" ON refund_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = requested_by);

DROP POLICY IF EXISTS "refund_update_admin" ON refund_requests;
CREATE POLICY "refund_update_admin" ON refund_requests FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- ============ MASTER CATEGORIES ============
CREATE TABLE IF NOT EXISTS master_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE master_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cat_select_all" ON master_categories;
CREATE POLICY "cat_select_all" ON master_categories FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "cat_admin_all" ON master_categories;
CREATE POLICY "cat_admin_all" ON master_categories FOR ALL
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- ============ ADD COLUMNS ============
ALTER TABLE profiles_umkm ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE profiles_mahasiswa ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS dispute_status text CHECK (dispute_status IN ('none', 'open', 'resolved', 'escalated'));
ALTER TABLE projects ALTER COLUMN dispute_status SET DEFAULT 'none';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS rejection_reason text;

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_blacklist_email ON blacklist(email);
CREATE INDEX IF NOT EXISTS idx_refund_project ON refund_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_refund_status ON refund_requests(status);

-- ============ SEED DEFAULT CATEGORIES ============
INSERT INTO master_categories (name, icon) VALUES
  ('Desain Grafis', 'palette'), ('Desain UI/UX', 'monitor'), ('Web Development', 'code'),
  ('Mobile Development', 'smartphone'), ('Content Writing', 'pen-tool'), ('Copywriting', 'pen-tool'),
  ('Digital Marketing', 'trending-up'), ('Social Media', 'share-2'), ('Video Editing', 'video'),
  ('Fotografi', 'camera'), ('Data Entry', 'database'), ('Translation', 'globe'),
  ('Administrasi', 'briefcase'), ('Akuntansi', 'calculator'), ('Lainnya', 'more-horizontal')
ON CONFLICT (name) DO NOTHING;
