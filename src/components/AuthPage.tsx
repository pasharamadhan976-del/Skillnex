import { useState } from 'react';
import { Sparkles, Mail, Lock, Store, GraduationCap, ArrowLeft, CheckCircle2, ArrowRight, ShieldCheck, Zap, Star, Shield } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Button } from './ui';
import type { UserRole, LayananType } from '../lib/types';

interface AuthPageProps {
  mode: 'login' | 'register';
  onBack: () => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
  onAdminLogin: () => void;
}

export function AuthPage({ mode, onBack, onSwitchMode, onAdminLogin }: AuthPageProps) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('umkm');
  const [loginRole, setLoginRole] = useState<'umkm' | 'mahasiswa' | 'admin'>('umkm');
  const [layananType, setLayananType] = useState<LayananType>('basic');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('Password minimal 6 karakter'); return; }
    if (mode === 'register' && !agreed) { setError('Anda harus menyetujui Syarat & Ketentuan'); return; }
    setLoading(true);
    if (mode === 'login' && loginRole === 'admin') {
      const result = await signIn(email, password);
      if (result.error) setError(result.error);
      else onAdminLogin();
    } else {
      const result = mode === 'login' ? await signIn(email, password) : await signUp(email, password, role, layananType);
      if (result.error) setError(result.error);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    const result = await signInWithGoogle(role, layananType);
    if (result.error) { setError(result.error); setGoogleLoading(false); }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1920" alt="Background" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900/95 via-navy-800/90 to-emerald-900/85" />
        <div className="relative flex flex-col justify-center px-12 xl:px-20 text-white z-10">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-emerald-gradient flex items-center justify-center"><Sparkles size={22} className="text-white" /></div>
            <span className="text-2xl font-bold">Skillnex</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-6">{mode === 'login' ? 'Selamat Datang Kembali!' : 'Bergabung dengan Skillnex'}</h1>
          <p className="text-white/70 text-lg mb-8 leading-relaxed">{mode === 'login' ? 'Masuk ke akun Anda untuk melanjutkan kolaborasi dengan talenta terbaik.' : 'Daftar sekarang dan mulai perjalanan Anda sebagai UMKM atau talenta mahasiswa.'}</p>
          <div className="space-y-4">
            {['Pembayaran aman dengan sistem escrow', 'Chat langsung & negosiasi proyek', 'Portofolio otomatis & sistem rating', 'Verifikasi & kurasi talenta terpercaya'].map((item, i) => (
              <div key={i} className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" /><span className="text-white/80">{item}</span></div>
            ))}
          </div>
          {/* Testimonial with Indonesian person */}
          <div className="mt-10 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
            <div className="flex items-center gap-3">
              <img src="https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=100" alt="Testimonial" className="w-12 h-12 rounded-full object-cover" />
              <div>
                <div className="flex items-center gap-1 mb-1">{[1,2,3,4,5].map((s) => <Star key={s} size={12} className="fill-sunshine-400 text-sunshine-400" />)}</div>
                <p className="text-sm text-white/80">"Berkat Skillnex, UMKM saya mendapat talenta mahasiswa yang kreatif dan profesional."</p>
                <p className="text-xs text-white/50 mt-1">- Dewi Lestari, Pemilik Cafe Senja</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-navy-700 mb-8 transition-colors">
            <ArrowLeft size={18} /><span className="text-sm font-medium">Kembali ke Beranda</span>
          </button>
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-emerald-gradient flex items-center justify-center"><Sparkles size={20} className="text-white" /></div>
            <span className="text-xl font-bold text-navy-800">Skillnex</span>
          </div>
          <h2 className="text-2xl font-bold text-navy-800 mb-2">{mode === 'login' ? 'Masuk ke Akun' : 'Buat Akun Baru'}</h2>
          <p className="text-gray-500 mb-6 text-sm">{mode === 'login' ? 'Masukkan email dan password Anda' : 'Pilih peran dan lengkapi data Anda'}</p>

          {/* Login Role Toggle */}
          {mode === 'login' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-navy-700 mb-3">Masuk sebagai</label>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => setLoginRole('umkm')} className={`p-3 rounded-xl border-2 transition-all text-center ${loginRole === 'umkm' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <Store size={20} className={`mx-auto ${loginRole === 'umkm' ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <div className="text-xs font-medium text-navy-800 mt-1.5">UMKM</div>
                </button>
                <button type="button" onClick={() => setLoginRole('mahasiswa')} className={`p-3 rounded-xl border-2 transition-all text-center ${loginRole === 'mahasiswa' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <GraduationCap size={20} className={`mx-auto ${loginRole === 'mahasiswa' ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <div className="text-xs font-medium text-navy-800 mt-1.5">Mahasiswa</div>
                </button>
                <button type="button" onClick={() => setLoginRole('admin')} className={`p-3 rounded-xl border-2 transition-all text-center ${loginRole === 'admin' ? 'border-navy-400 bg-navy-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <Shield size={20} className={`mx-auto ${loginRole === 'admin' ? 'text-navy-600' : 'text-gray-400'}`} />
                  <div className="text-xs font-medium text-navy-800 mt-1.5">Admin</div>
                </button>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-navy-700 mb-3">Daftar sebagai</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setRole('umkm')} className={`p-4 rounded-xl border-2 transition-all text-left ${role === 'umkm' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <Store size={24} className={role === 'umkm' ? 'text-emerald-600' : 'text-gray-400'} />
                  <div className="font-semibold text-navy-800 mt-2 text-sm">UMKM</div>
                  <div className="text-xs text-gray-500">Cari & tawarkan pekerjaan</div>
                </button>
                <button type="button" onClick={() => setRole('mahasiswa')} className={`p-4 rounded-xl border-2 transition-all text-left ${role === 'mahasiswa' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <GraduationCap size={24} className={role === 'mahasiswa' ? 'text-emerald-600' : 'text-gray-400'} />
                  <div className="font-semibold text-navy-800 mt-2 text-sm">Mahasiswa</div>
                  <div className="text-xs text-gray-500">Tawarkan talenta</div>
                </button>
              </div>
            </div>
          )}

          {mode === 'register' && role === 'umkm' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-navy-700 mb-3">Pilih Tipe Layanan</label>
              <div className="space-y-3">
                {/* Basic */}
                <button type="button" onClick={() => setLayananType('basic')} className={`w-full p-4 rounded-xl border-2 transition-all text-left ${layananType === 'basic' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${layananType === 'basic' ? 'bg-emerald-100' : 'bg-gray-100'}`}><Star size={20} className={layananType === 'basic' ? 'text-emerald-600' : 'text-gray-400'} /></div>
                    <div className="flex-1"><div className="font-semibold text-navy-800 text-sm">Basic</div><div className="text-xs text-gray-500">Komisi 5% per proyek</div></div>
                    <span className="text-lg font-bold text-emerald-600">5%</span>
                  </div>
                  <ul className="space-y-1.5">
                    {[
                      'Akses ke marketplace talenta mahasiswa',
                      'Chat langsung & negosiasi dengan talenta',
                      'Sistem pembayaran aman (Escrow)',
                      'Posting lowongan proyek tanpa batas',
                      'Review & rating talenta setelah proyek selesai',
                      'Dukungan via tiket bantuan (respons 2x24 jam)',
                    ].map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600"><CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />{f}</li>
                    ))}
                  </ul>
                </button>

                {/* Priority */}
                <button type="button" onClick={() => setLayananType('priority')} className={`w-full p-4 rounded-xl border-2 transition-all text-left ${layananType === 'priority' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${layananType === 'priority' ? 'bg-emerald-100' : 'bg-gray-100'}`}><Zap size={20} className={layananType === 'priority' ? 'text-emerald-600' : 'text-gray-400'} /></div>
                    <div className="flex-1"><div className="font-semibold text-navy-800 text-sm">Priority</div><div className="text-xs text-gray-500">Komisi 10% per proyek</div></div>
                    <span className="text-lg font-bold text-emerald-600">10%</span>
                  </div>
                  <ul className="space-y-1.5">
                    {[
                      'Semua fitur layanan Basic',
                      'Prioritas matching dengan talenta terverifikasi',
                      'Badge "Priority UMKM" di profil & marketplace',
                      'Talenta rekomendasi pilihan admin (kurasi khusus)',
                      'Dukungan prioritas via tiket bantuan (respons 1x24 jam)',
                      'Fitur dispute resolution dengan mediasi admin khusus',
                      'Laporan performa proyek & analitik dashboard',
                    ].map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600"><CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />{f}</li>
                    ))}
                  </ul>
                </button>
              </div>
            </div>
          )}

          {/* Google Login - hidden for admin role */}
          {loginRole !== 'admin' && mode === 'login' && (
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl border-2 border-gray-200 bg-white text-navy-700 font-medium transition-all hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 mb-4"
            >
              {googleLoading ? (
                <span className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-emerald-500 rounded-full" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {mode === 'login' ? 'Masuk dengan Google' : 'Daftar dengan Google'}
            </button>
          )}

          {loginRole !== 'admin' && mode === 'login' && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">atau</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {loginRole === 'admin' && mode === 'login' && (
              <div className="px-4 py-3 rounded-xl bg-navy-50 border border-navy-200 text-sm text-navy-700 flex items-center gap-2">
                <Shield size={16} className="text-navy-500" />
                <span>Mode login Admin. Hanya akun admin yang dapat masuk.</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" className="input-field pl-11" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" className="input-field pl-11" />
              </div>
            </div>
            {mode === 'register' && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-400" />
                <span className="text-sm text-gray-600">Saya menyetujui <span className="text-emerald-600 font-medium">Syarat & Ketentuan</span> serta <span className="text-emerald-600 font-medium">Kebijakan Privasi</span> Skillnex</span>
              </label>
            )}
            {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm animate-slide-down">{error}</div>}
            <Button type="submit" loading={loading} className="w-full py-3.5">
              {mode === 'login' ? 'Masuk' : 'Daftar Sekarang'} <ArrowRight size={18} />
            </Button>
          </form>

          {mode === 'login' && loginRole !== 'admin' && (
            <div className="mt-4 text-center text-sm text-gray-500">
              <button onClick={() => onSwitchMode('register')} className="text-emerald-600 font-semibold hover:underline">Belum punya akun? Daftar di sini</button>
            </div>
          )}
          {mode === 'register' && (
            <div className="mt-4 text-center text-sm text-gray-500">
              <button onClick={() => onSwitchMode('login')} className="text-emerald-600 font-semibold hover:underline">Sudah punya akun? Masuk di sini</button>
            </div>
          )}
          {mode === 'login' && loginRole !== 'admin' && (
            <div className="mt-3 text-center">
              <button onClick={() => alert('Fitur lupa password akan segera hadir. Hubungi admin@skillnex.id untuk reset manual.')} className="text-sm text-gray-400 hover:text-navy-600 transition-colors">Lupa password?</button>
            </div>
          )}

          {mode === 'login' && loginRole !== 'admin' && (
            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <button onClick={() => setLoginRole('admin')} className="inline-flex items-center gap-2 text-sm text-navy-500 hover:text-navy-700 font-medium transition-colors">
                <ShieldCheck size={16} /> Login sebagai Admin
              </button>
            </div>
          )}
          {mode === 'login' && loginRole === 'admin' && (
            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <button onClick={() => setLoginRole('umkm')} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-navy-600 font-medium transition-colors">
                <ArrowLeft size={14} /> Kembali ke login user
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
