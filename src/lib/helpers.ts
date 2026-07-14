import { supabase } from './supabase';

export async function createNotification(
  userId: string, type: string, title: string, message: string, projectId?: string
) {
  try {
    await (supabase.from('notifications') as any).insert({
      user_id: userId, type, title, message, project_id: projectId ?? null,
    });
  } catch (e) {
    console.error('Failed to create notification:', e);
  }
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Baru saja';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} bulan lalu`;
  return `${Math.floor(months / 12)} tahun lalu`;
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function timeLeft(deadline: string): { text: string; urgent: boolean } | null {
  const date = new Date(deadline);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (diff < 0) return { text: 'Terlambat', urgent: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return { text: `${days} hari tersisa`, urgent: days <= 2 };
  if (hours > 0) return { text: `${hours} jam tersisa`, urgent: true };
  return { text: 'Segera', urgent: true };
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Handle Google OAuth callback - create profile if user doesn't have one
export async function handleOAuthCallback(user: any) {
  const pendingRole = localStorage.getItem('skillnex_pending_role');
  if (!pendingRole) return;

  // Check if profile already exists
  const { data: existingUmkm } = await supabase.from('profiles_umkm').select('id').eq('user_id', user.id).maybeSingle();
  const { data: existingMhs } = await supabase.from('profiles_mahasiswa').select('id').eq('user_id', user.id).maybeSingle();
  const { data: existingAdmin } = await supabase.from('admin_users').select('id').eq('user_id', user.id).maybeSingle();

  if (existingUmkm || existingMhs || existingAdmin) {
    localStorage.removeItem('skillnex_pending_role');
    return;
  }

  const googleId = user.app_metadata?.provider === 'google' ? user.user_metadata?.provider_id : null;
  const fullName = user.user_metadata?.full_name || user.email || '';

  if (pendingRole === 'umkm') {
    const pendingLayanan = localStorage.getItem('skillnex_pending_layanan') || 'basic';
    await (supabase.from('profiles_umkm') as any).insert({
      user_id: user.id, nama_umkm: '', nama_pemilik: fullName,
      layanan_type: pendingLayanan, status_verif: 'pending', registration_step: 1,
      google_id: googleId, terms_agreed: true,
    });
    localStorage.removeItem('skillnex_pending_layanan');
  } else if (pendingRole === 'mahasiswa') {
    await (supabase.from('profiles_mahasiswa') as any).insert({
      user_id: user.id, nama_lengkap: fullName,
      status_verif: 'pending', registration_step: 1,
      google_id: googleId, terms_agreed: true,
    });
  }

  localStorage.removeItem('skillnex_pending_role');
}
