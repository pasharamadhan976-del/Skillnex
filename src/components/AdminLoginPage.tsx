import { useState } from 'react';
import { ShieldCheck, Mail, Lock, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Button } from './ui';

interface AdminLoginPageProps {
  onBack: () => void;
}

export function AdminLoginPage({ onBack }: AdminLoginPageProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email, password);
    if (err) setError(err);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 p-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-navy-600/20 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors">
          <ArrowLeft size={18} /><span className="text-sm font-medium">Kembali</span>
        </button>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Admin Skillnex</h1>
              <p className="text-white/50 text-sm">Portal Manajemen</p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-sunshine-500/10 border border-sunshine-500/20 mb-6">
            <AlertTriangle size={18} className="text-sunshine-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-white/70">Akses hanya untuk administrator Skillnex. Aktivitas login akan dicatat.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Email Admin</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@skillnex.id" className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-all" />
              </div>
            </div>
            {error && <div className="px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">{error}</div>}
            <Button type="submit" loading={loading} className="w-full py-3.5">Masuk ke Panel Admin</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
