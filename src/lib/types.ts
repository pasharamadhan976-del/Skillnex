export type UserRole = 'umkm' | 'mahasiswa' | 'admin';
export type LayananType = 'basic' | 'priority';
export type ProjectStatus =
  | 'negotiation' | 'funded' | 'in_progress' | 'review' | 'revision' | 'completed' | 'cancelled' | 'disputed';
export type EscrowStatus = 'held' | 'released' | 'refunded';
export type PaymentMethod = 'qris' | 'transfer' | 'e-wallet';
export type VerifStatus = 'pending' | 'interview' | 'verified' | 'rejected' | 'active';
export type AdminRole = 'super_admin' | 'verifikator' | 'financial_officer';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketCategory = 'general' | 'payment' | 'project_dispute' | 'verification' | 'technical';

export interface ProfileUmkm {
  id: string; user_id: string; nama_umkm: string; nama_pemilik: string;
  telepon: string | null; alamat: string | null; deskripsi: string | null;
  layanan_type: LayananType; status_verif: VerifStatus; logo_url: string | null;
  kategori_bisnis: string | null; terms_agreed: boolean; registration_step: number;
  website: string | null; google_id: string | null; rejection_reason: string | null;
  created_at: string; updated_at: string;
}

export interface ProfileMahasiswa {
  id: string; user_id: string; nama_lengkap: string; telepon: string | null;
  universitas: string | null; jurusan: string | null; semester: number | null;
  deskripsi_diri: string | null; status_verif: VerifStatus; foto_url: string | null;
  portofolio_link: string | null; terms_agreed: boolean; registration_step: number;
  tarif_per_proyek: number | null; total_proyek: number; google_id: string | null;
  rejection_reason: string | null; bank_name: string | null; bank_account_name: string | null; bank_account_number: string | null;
  created_at: string; updated_at: string;
}

export interface Skill { id: string; mahasiswa_id: string; kategori: string; spesialis: string | null; deskripsi: string | null; tingkat: 'pemula' | 'menengah' | 'mahir'; created_at: string; }
export interface Portfolio { id: string; mahasiswa_id: string; project_id: string | null; judul: string; deskripsi: string | null; kategori: string | null; image_url: string | null; rating: number | null; is_from_project: boolean; created_at: string; }

export interface Project {
  id: string; umkm_id: string; mahasiswa_id: string | null; umkm_user_id: string;
  mahasiswa_user_id: string | null; judul: string; deskripsi: string; kategori: string | null;
  budget: number | null; harga_disepakati: number | null; deadline: string | null;
  status: ProjectStatus; layanan_type: LayananType; counter_offer: number | null;
  revision_notes: string | null; completion_notes: string | null; is_umkm_reviewed: boolean;
  is_umkm_confirmed: boolean; is_mhs_confirmed: boolean; dispute_status: 'none' | 'open' | 'resolved' | 'escalated' | null;
  scope_of_work: string | null; work_submitted_at: string | null; accepted_at: string | null;
  created_at: string; updated_at: string;
}

export interface ProjectApplication {
  id: string; project_id: string; mahasiswa_user_id: string; mahasiswa_id: string;
  pitch: string | null; proposed_price: number | null; status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface Transaction {
  id: string; project_id: string; umkm_user_id: string; mahasiswa_user_id: string | null;
  amount: number; komisi_skillnex: number; handling_fee: number; net_to_mahasiswa: number;
  metode_pembayaran: PaymentMethod | null; status_escrow: EscrowStatus;
  payment_ref: string | null; payment_proof: string | null; paid_at: string | null;
  released_at: string | null; created_at: string;
}

export interface Message { id: string; project_id: string; sender_id: string; receiver_id: string; content: string; is_read: boolean; created_at: string; }
export interface Notification { id: string; user_id: string; type: string; title: string; message: string; project_id: string | null; is_read: boolean; created_at: string; }
export interface Review { id: string; project_id: string; umkm_user_id: string; mahasiswa_user_id: string; rating: number; komentar: string | null; created_at: string; }

export interface AdminUser { id: string; user_id: string; admin_role: AdminRole; created_at: string; }
export interface SupportTicket {
  id: string; user_id: string; subject: string; description: string; category: TicketCategory;
  related_project_id: string | null; status: TicketStatus; priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_admin_id: string | null; created_at: string; updated_at: string;
}
export interface TicketMessage { id: string; ticket_id: string; sender_id: string; content: string; is_from_admin: boolean; is_read: boolean; created_at: string; }
export interface AuditLog { id: string; admin_id: string | null; action_performed: string; target_id: string | null; target_table: string | null; details: string | null; created_at: string; }
export interface Document { id: string; user_id: string; doc_type: string; file_name: string; file_url: string | null; is_verified: boolean; admin_notes: string | null; rejection_reason: string | null; created_at: string; }
export interface BlacklistEntry { id: string; user_id: string | null; email: string; reason: string; blocked_by: string | null; created_at: string; }
export interface RefundRequest { id: string; project_id: string; transaction_id: string | null; requested_by: string; reason: string; status: 'pending' | 'approved' | 'rejected'; admin_notes: string | null; processed_by: string | null; created_at: string; processed_at: string | null; }
export interface MasterCategory { id: string; name: string; icon: string | null; is_active: boolean; created_at: string; }

export interface ProjectFile { id: string; project_id: string; uploaded_by: string; file_name: string; file_url: string; file_type: string | null; is_final_submission: boolean; created_at: string; }
export interface Withdrawal { id: string; mahasiswa_user_id: string; amount: number; bank_name: string | null; bank_account_name: string | null; bank_account_number: string | null; status: 'pending' | 'approved' | 'rejected' | 'processed'; admin_notes: string | null; processed_by: string | null; requested_at: string; processed_at: string | null; }
export interface Invoice { id: string; project_id: string; invoice_number: string; umkm_user_id: string; mahasiswa_user_id: string | null; amount: number; komisi_amount: number; handling_fee: number; net_amount: number; status: 'issued' | 'paid' | 'cancelled'; issued_at: string; }
export interface Dispute { id: string; project_id: string; raised_by: string; reason: string; description: string | null; status: 'open' | 'investigating' | 'resolved_refund' | 'resolved_payout' | 'rejected'; resolution_notes: string | null; resolved_by: string | null; created_at: string; resolved_at: string | null; }
export interface InternalNote { id: string; target_user_id: string | null; target_project_id: string | null; note_type: 'user' | 'project'; content: string; created_by: string; created_at: string; }
export interface Broadcast { id: string; admin_id: string; title: string; message: string; target_role: 'all' | 'umkm' | 'mahasiswa'; target_category: string | null; created_at: string; }
export interface PlatformSetting { id: string; key: string; value: string; description: string | null; updated_by: string | null; updated_at: string; }

export const KOMISI_BASIC = 0.05;
export const KOMISI_PRIORITY = 0.10;
export const HANDLING_FEE = 0.02;

export function calculateFees(amount: number, layananType: LayananType) {
  const komisiRate = layananType === 'priority' ? KOMISI_PRIORITY : KOMISI_BASIC;
  const komisi = amount * komisiRate;
  const handling = amount * HANDLING_FEE;
  const net = amount - komisi - handling;
  return { komisi, handling, net, komisiRate };
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

export const KATEGORI_SKILLS = [
  'Desain Grafis', 'Desain UI/UX', 'Web Development', 'Mobile Development',
  'Content Writing', 'Copywriting', 'Digital Marketing', 'Social Media',
  'Video Editing', 'Fotografi', 'Data Entry', 'Translation',
  'Pendidikan', 'Jasa & Keterampilan', 'Event & Hospitality', 'Support & Operasional',
  'Administrasi', 'Akuntansi', 'Lainnya',
];

// Mapping spesialis -> kategori induk (for grouping)
export const SPESIALIS_TO_KATEGORI: Record<string, string> = {
  'Desain Grafis': 'Desain & Kreatif',
  'Desain UI/UX': 'Desain & Kreatif',
  'Fotografi': 'Desain & Kreatif',
  'Web Development': 'Teknologi & IT',
  'Mobile Development': 'Teknologi & IT',
  'Data Entry': 'Teknologi & IT',
  'Content Writing': 'Konten & Media',
  'Copywriting': 'Konten & Media',
  'Video Editing': 'Konten & Media',
  'Digital Marketing': 'Marketing & Bisnis',
  'Social Media': 'Marketing & Bisnis',
  'Akuntansi': 'Marketing & Bisnis',
  'Translation': 'Bahasa',
  'Pendidikan': 'Pendidikan',
  'Jasa & Keterampilan': 'Jasa & Keterampilan',
  'Event & Hospitality': 'Event & Hospitality',
  'Support & Operasional': 'Support & Operasional',
  'Administrasi': 'Administrasi & Operasional',
  'Lainnya': 'Lainnya',
};

// Kategori induk (untuk filter grouping)
export const KATEGORI_INDUK = Array.from(new Set(Object.values(SPESIALIS_TO_KATEGORI)));

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  negotiation: 'Negosiasi', funded: 'Dana di Escrow', in_progress: 'Sedang Dikerjakan',
  review: 'Menunggu Review', revision: 'Perlu Revisi', completed: 'Selesai',
  cancelled: 'Dibatalkan', disputed: 'Sengketa',
};

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  negotiation: 'badge-gray', funded: 'badge-sunshine', in_progress: 'badge-navy',
  review: 'badge-sunshine', revision: 'badge-red', completed: 'badge-emerald',
  cancelled: 'badge-red', disputed: 'badge-red',
};

export const PROJECT_STEPS = [
  { key: 'negotiation', label: 'Negosiasi' },
  { key: 'funded', label: 'Escrow' },
  { key: 'in_progress', label: 'Kerja' },
  { key: 'review', label: 'Review' },
  { key: 'completed', label: 'Selesai' },
] as const;

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  general: 'Umum', payment: 'Pembayaran', project_dispute: 'Sengketa Proyek',
  verification: 'Verifikasi', technical: 'Teknis',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Terbuka', in_progress: 'Diproses', resolved: 'Selesai', closed: 'Ditutup',
};
