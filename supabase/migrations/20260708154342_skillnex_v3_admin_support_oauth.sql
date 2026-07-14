/*
# Skillnex V3 - Admin, Support Tickets, Google OAuth & Dispute System

## Changes:
1. admin_users table - Admin roles (super_admin, verifikator, financial_officer)
2. support_tickets - UMKM/Mahasiswa can contact admin for help/disputes
3. ticket_messages - Chat within support tickets
4. audit_logs - Track all admin actions
5. profiles_umkm/mahasiswa - Add google_id column for OAuth
6. Fix RLS policies for cross-user notification inserts
*/

-- ============ ADMIN USERS ============
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_role text NOT NULL DEFAULT 'verifikator' CHECK (admin_role IN ('super_admin', 'verifikator', 'financial_officer')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_own" ON admin_users;
CREATE POLICY "admin_select_own" ON admin_users FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- ============ SUPPORT TICKETS ============
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'payment', 'project_dispute', 'verification', 'technical')),
  related_project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_select_own" ON support_tickets;
CREATE POLICY "ticket_select_own" ON support_tickets FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR assigned_admin_id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

DROP POLICY IF EXISTS "ticket_insert_own" ON support_tickets;
CREATE POLICY "ticket_insert_own" ON support_tickets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ticket_update_own" ON support_tickets;
CREATE POLICY "ticket_update_own" ON support_tickets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- ============ TICKET MESSAGES ============
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_from_admin boolean DEFAULT false,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tmsg_select_participants" ON ticket_messages;
CREATE POLICY "tmsg_select_participants" ON ticket_messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = ticket_messages.ticket_id AND (support_tickets.user_id = auth.uid() OR support_tickets.assigned_admin_id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())))
  );

DROP POLICY IF EXISTS "tmsg_insert_own" ON ticket_messages;
CREATE POLICY "tmsg_insert_own" ON ticket_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);

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

DROP POLICY IF EXISTS "audit_select_admin" ON audit_logs;
CREATE POLICY "audit_select_admin" ON audit_logs FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

DROP POLICY IF EXISTS "audit_insert_admin" ON audit_logs;
CREATE POLICY "audit_insert_admin" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- ============ ADD GOOGLE ID COLUMNS ============
ALTER TABLE profiles_umkm ADD COLUMN IF NOT EXISTS google_id text;
ALTER TABLE profiles_mahasiswa ADD COLUMN IF NOT EXISTS google_id text;

-- ============ FIX NOTIFICATION INSERT POLICY ============
-- Allow any authenticated user to insert notifications (for cross-user notifs)
DROP POLICY IF EXISTS "notif_insert_any" ON notifications;
CREATE POLICY "notif_insert_any" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============ ADMIN CAN READ ALL PROFILES ============
DROP POLICY IF EXISTS "admin_read_all_umkm" ON profiles_umkm;
CREATE POLICY "admin_read_all_umkm" ON profiles_umkm FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

DROP POLICY IF EXISTS "admin_read_all_mhs" ON profiles_mahasiswa;
CREATE POLICY "admin_read_all_mhs" ON profiles_mahasiswa FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- ============ ADMIN CAN UPDATE PROFILES (for verification) ============
DROP POLICY IF EXISTS "admin_update_umkm" ON profiles_umkm;
CREATE POLICY "admin_update_umkm" ON profiles_umkm FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

DROP POLICY IF EXISTS "admin_update_mhs" ON profiles_mahasiswa;
CREATE POLICY "admin_update_mhs" ON profiles_mahasiswa FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- ============ ADMIN CAN READ ALL PROJECTS & TRANSACTIONS ============
DROP POLICY IF EXISTS "admin_read_projects" ON projects;
CREATE POLICY "admin_read_projects" ON projects FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

DROP POLICY IF EXISTS "admin_read_tx" ON transactions;
CREATE POLICY "admin_read_tx" ON transactions FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- ============ ADMIN CAN UPDATE PROJECTS (for dispute resolution) ============
DROP POLICY IF EXISTS "admin_update_projects" ON projects;
CREATE POLICY "admin_update_projects" ON projects FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- ============ ADMIN CAN READ ALL DOCUMENTS ============
DROP POLICY IF EXISTS "admin_read_docs" ON documents;
CREATE POLICY "admin_read_docs" ON documents FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

DROP POLICY IF EXISTS "admin_verify_docs" ON documents;
CREATE POLICY "admin_verify_docs" ON documents FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_admin_user ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_msgs ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_umkm_google_id ON profiles_umkm(google_id);
CREATE INDEX IF NOT EXISTS idx_mhs_google_id ON profiles_mahasiswa(google_id);
