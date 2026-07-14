/*
# Skillnex V10 - Enterprise PRD Implementation

Adds missing tables for full PRD coverage:
1. project_files - submitted work files
2. withdrawals - mahasiswa payout requests
3. invoices - auto-generated invoices for UMKM & mahasiswa
4. disputes - formal dispute resolution center
5. internal_notes - private notes on users (admin) and projects (UMKM)
6. broadcasts - admin smart broadcast system
7. platform_settings - global kill switch & config
8. Add scope_of_work to projects
9. Add work_submitted_at to projects
10. Add bank_account to profiles_mahasiswa for payouts
*/

-- ============ PROJECT FILES (Submit Hasil Kerja) ============
CREATE TABLE IF NOT EXISTS project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  is_final_submission boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pfile_select_participants" ON project_files FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_files.project_id AND (p.umkm_user_id = auth.uid() OR p.mahasiswa_user_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
  );

CREATE POLICY "pfile_insert_participants" ON project_files FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_files.project_id AND (p.umkm_user_id = auth.uid() OR p.mahasiswa_user_id = auth.uid()))
  );

CREATE POLICY "pfile_delete_own" ON project_files FOR DELETE
  TO authenticated USING (auth.uid() = uploaded_by);

CREATE INDEX IF NOT EXISTS idx_pfiles_project ON project_files(project_id);

-- ============ WITHDRAWALS (Payout System) ============
CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mahasiswa_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount decimal(15,2) NOT NULL,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  admin_notes text,
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wd_select_own" ON withdrawals FOR SELECT
  TO authenticated USING (mahasiswa_user_id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

CREATE POLICY "wd_insert_own" ON withdrawals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = mahasiswa_user_id);

CREATE POLICY "wd_update_admin" ON withdrawals FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_wd_mhs ON withdrawals(mahasiswa_user_id);
CREATE INDEX IF NOT EXISTS idx_wd_status ON withdrawals(status);

-- ============ INVOICES ============
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  umkm_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mahasiswa_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount decimal(15,2) NOT NULL,
  komisi_amount decimal(15,2) DEFAULT 0,
  handling_fee decimal(15,2) DEFAULT 0,
  net_amount decimal(15,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'paid', 'cancelled')),
  issued_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_select_participants" ON invoices FOR SELECT
  TO authenticated USING (umkm_user_id = auth.uid() OR mahasiswa_user_id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

CREATE POLICY "inv_insert_system" ON invoices FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_inv_project ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_inv_umkm ON invoices(umkm_user_id);

-- ============ DISPUTES (Formal Dispute Center) ============
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  raised_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved_refund', 'resolved_payout', 'rejected')),
  resolution_notes text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disp_select_participants" ON disputes FOR SELECT
  TO authenticated USING (
    raised_by = auth.uid()
    OR EXISTS (SELECT 1 FROM projects p WHERE p.id = disputes.project_id AND (p.umkm_user_id = auth.uid() OR p.mahasiswa_user_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
  );

CREATE POLICY "disp_insert_participants" ON disputes FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = raised_by AND
    EXISTS (SELECT 1 FROM projects p WHERE p.id = disputes.project_id AND (p.umkm_user_id = auth.uid() OR p.mahasiswa_user_id = auth.uid()))
  );

CREATE POLICY "disp_update_admin" ON disputes FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_disp_project ON disputes(project_id);
CREATE INDEX IF NOT EXISTS idx_disp_status ON disputes(status);

-- ============ INTERNAL NOTES ============
CREATE TABLE IF NOT EXISTS internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  target_project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  note_type text NOT NULL CHECK (note_type IN ('user', 'project')),
  content text NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "note_select_own" ON internal_notes FOR SELECT
  TO authenticated USING (
    (note_type = 'user' AND target_user_id = auth.uid())
    OR (note_type = 'project' AND EXISTS (SELECT 1 FROM projects p WHERE p.id = target_project_id AND (p.umkm_user_id = auth.uid() OR p.mahasiswa_user_id = auth.uid())))
    OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
  );

CREATE POLICY "note_insert_own" ON internal_notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "note_delete_own" ON internal_notes FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS idx_notes_target_user ON internal_notes(target_user_id);
CREATE INDEX IF NOT EXISTS idx_notes_target_project ON internal_notes(target_project_id);

-- ============ BROADCASTS (Smart Broadcast) ============
CREATE TABLE IF NOT EXISTS broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  target_role text NOT NULL DEFAULT 'all' CHECK (target_role IN ('all', 'umkm', 'mahasiswa')),
  target_category text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bc_select_all" ON broadcasts FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "bc_insert_admin" ON broadcasts FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

CREATE POLICY "bc_delete_admin" ON broadcasts FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_bc_target ON broadcasts(target_role);

-- ============ PLATFORM SETTINGS (Kill Switch etc) ============
CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ps_select_all" ON platform_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "ps_update_admin" ON platform_settings FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

CREATE POLICY "ps_insert_admin" ON platform_settings FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Seed default settings
INSERT INTO platform_settings (key, value, description) VALUES
  ('kill_switch_transactions', 'false', 'Emergency toggle to disable all transactions'),
  ('commission_rate_basic', '5', 'Commission percentage for basic UMKM (5%)'),
  ('commission_rate_priority', '10', 'Commission percentage for priority UMKM (10%)'),
  ('handling_fee_rate', '2', 'Handling fee percentage (2%)'),
  ('platform_name', 'Skillnex', 'Platform display name')
ON CONFLICT (key) DO NOTHING;

-- ============ ADD COLUMNS TO EXISTING TABLES ============

-- Add scope_of_work to projects (for contract details)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS scope_of_work text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS work_submitted_at timestamptz;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

-- Add bank account to profiles_mahasiswa (for payouts)
ALTER TABLE profiles_mahasiswa ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE profiles_mahasiswa ADD COLUMN IF NOT EXISTS bank_account_name text;
ALTER TABLE profiles_mahasiswa ADD COLUMN IF NOT EXISTS bank_account_number text;

-- Add internal_notes column to support_tickets (admin private notes)
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS admin_internal_notes text;

-- ============ STORAGE BUCKET FOR PROJECT FILES ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "projfile_upload_own" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'project-files' AND auth.uid() = owner);

CREATE POLICY "projfile_read_participants" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'project-files');

-- ============ ADMIN POLICIES FOR NEW TABLES ============
-- Admin can read all project files
CREATE POLICY "admin_read_pfiles_all" ON project_files FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can read all withdrawals
CREATE POLICY "admin_read_wd_all" ON withdrawals FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can update withdrawals
CREATE POLICY "admin_update_wd_all" ON withdrawals FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can read all invoices
CREATE POLICY "admin_read_inv_all" ON invoices FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can read all disputes
CREATE POLICY "admin_read_disp_all" ON disputes FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can update disputes
CREATE POLICY "admin_update_disp_all" ON disputes FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can read all internal notes
CREATE POLICY "admin_read_notes_all" ON internal_notes FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can read all broadcasts
CREATE POLICY "admin_read_bc_all" ON broadcasts FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can read all platform settings
CREATE POLICY "admin_read_ps_all" ON platform_settings FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can update platform settings
CREATE POLICY "admin_update_ps_all" ON platform_settings FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can read all messages (for dispute evidence)
CREATE POLICY "admin_read_msgs_all" ON messages FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can insert audit logs
DROP POLICY IF EXISTS "admin_insert_audit" ON audit_logs;
CREATE POLICY "admin_insert_audit" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can read all project applications
CREATE POLICY "admin_read_apps_all" ON project_applications FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can read all refund requests
CREATE POLICY "admin_read_refunds_all" ON refund_requests FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can update refund requests
CREATE POLICY "admin_update_refunds_all" ON refund_requests FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can read all support tickets
CREATE POLICY "admin_read_tickets_all" ON support_tickets FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can update support tickets
CREATE POLICY "admin_update_tickets_all" ON support_tickets FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can read all ticket messages
CREATE POLICY "admin_read_tmsg_all" ON ticket_messages FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can insert ticket messages
CREATE POLICY "admin_insert_tmsg" ON ticket_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);

-- Admin can read blacklist
CREATE POLICY "admin_read_blacklist_all" ON blacklist FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can insert blacklist
CREATE POLICY "admin_insert_blacklist" ON blacklist FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Admin can delete blacklist
CREATE POLICY "admin_delete_blacklist" ON blacklist FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));
