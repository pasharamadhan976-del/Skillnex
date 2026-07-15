import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { ProfileUmkm, ProfileMahasiswa, UserRole, AdminUser } from './types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  adminRole: string | null;
  profileUmkm: ProfileUmkm | null;
  profileMahasiswa: ProfileMahasiswa | null;
  loading: boolean;
  signUp: (email: string, password: string, role: UserRole, layananType?: 'basic' | 'priority') => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: (role: UserRole, layananType?: 'basic' | 'priority') => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [profileUmkm, setProfileUmkm] = useState<ProfileUmkm | null>(null);
  const [profileMahasiswa, setProfileMahasiswa] = useState<ProfileMahasiswa | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    // Check admin first
    const { data: admin } = await supabase.from('admin_users').select('*').eq('user_id', userId).maybeSingle();
    if (admin) {
      setRole('admin');
      setAdminRole((admin as AdminUser).admin_role);
      setProfileUmkm(null);
      setProfileMahasiswa(null);
      return;
    }

    const { data: umkm } = await supabase.from('profiles_umkm').select('*').eq('user_id', userId).maybeSingle();
    if (umkm) {
      setProfileUmkm(umkm as ProfileUmkm);
      setProfileMahasiswa(null);
      setRole('umkm');
      setAdminRole(null);
      return;
    }
    const { data: mhs } = await supabase.from('profiles_mahasiswa').select('*').eq('user_id', userId).maybeSingle();
    if (mhs) {
      setProfileMahasiswa(mhs as ProfileMahasiswa);
      setProfileUmkm(null);
      setRole('mahasiswa');
      setAdminRole(null);
      return;
    }
    setProfileUmkm(null);
    setProfileMahasiswa(null);
    setRole(null);
    setAdminRole(null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => { await loadProfile(session.user.id); setLoading(false); })();
      } else {
        setProfileUmkm(null);
        setProfileMahasiswa(null);
        setRole(null);
        setAdminRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string, selectedRole: UserRole, layananType: 'basic' | 'priority' = 'basic') {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { role: selectedRole } } });
    if (error) return { error: error.message };
    if (data.user) {
      if (selectedRole === 'umkm') {
        const { error: insertError } = await (supabase.from('profiles_umkm') as any).insert({
          user_id: data.user.id, nama_umkm: '', nama_pemilik: '',
          layanan_type: layananType, status_verif: 'pending', registration_step: 1, terms_agreed: true,
        });
        if (insertError) return { error: insertError.message };
      } else {
        const { error: insertError } = await (supabase.from('profiles_mahasiswa') as any).insert({
          user_id: data.user.id, nama_lengkap: '', status_verif: 'pending', registration_step: 1, terms_agreed: true,
        });
        if (insertError) return { error: insertError.message };
      }
      await loadProfile(data.user.id);
    }
    return { error: null };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signInWithGoogle(selectedRole: UserRole, layananType: 'basic' | 'priority' = 'basic') {
    const redirectTo = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) return { error: error.message };

    // After OAuth redirect, the onAuthStateChange will fire.
    // We store the intended role in localStorage so we can create the profile after redirect.
    localStorage.setItem('skillnex_pending_role', selectedRole);
    if (selectedRole === 'umkm') {
      localStorage.setItem('skillnex_pending_layanan', layananType);
    }
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfileUmkm(null);
    setProfileMahasiswa(null);
    setRole(null);
    setAdminRole(null);
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  return (
    <AuthContext.Provider value={{
      session, user, role, adminRole, profileUmkm, profileMahasiswa, loading,
      signUp, signIn, signInWithGoogle, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
