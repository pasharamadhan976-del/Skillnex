import { type ReactNode, useState, useEffect } from 'react';
import {
  Sparkles, LayoutDashboard, Search, Briefcase, MessageCircle, Bell,
  LogOut, Menu, X, Star, Store, GraduationCap, LifeBuoy, Wallet,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { getInitials, timeAgo } from '../lib/helpers';
import type { Notification } from '../lib/types';

export type DashboardPage =
  | 'home' | 'cari-talenta' | 'proyek-saya' | 'tawarkan-jasa'
  | 'chat' | 'notifikasi' | 'profil' | 'portofolio' | 'bantuan' | 'earning';

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage: DashboardPage;
  onNavigate: (page: DashboardPage) => void;
  onOpenChat?: (projectId: string, receiverId: string, receiverName: string) => void;
}

export function DashboardLayout({ children, currentPage, onNavigate, onOpenChat }: DashboardLayoutProps) {
  const { user, role, profileUmkm, profileMahasiswa, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [showNotif, setShowNotif] = useState(false);

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!user) return;
    loadNotifs();
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => loadNotifs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function loadNotifs() {
    if (!user) return;
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    if (data) setNotifs(data as Notification[]);
  }

  async function markAllRead() {
    if (!user) return;
    await (supabase.from('notifications') as any).update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  const displayName = role === 'umkm'
    ? profileUmkm?.nama_umkm || profileUmkm?.nama_pemilik || 'UMKM'
    : profileMahasiswa?.nama_lengkap || 'Mahasiswa';
  const displayFoto = role === 'umkm' ? profileUmkm?.logo_url : profileMahasiswa?.foto_url;

  const menuItems: { id: DashboardPage; label: string; icon: typeof Search }[] =
    role === 'umkm'
      ? [
          { id: 'home', label: 'Beranda', icon: LayoutDashboard },
          { id: 'cari-talenta', label: 'Cari Talenta', icon: Search },
          { id: 'proyek-saya', label: 'Pekerjaan Saya', icon: Briefcase },
          { id: 'chat', label: 'Chat', icon: MessageCircle },
          { id: 'notifikasi', label: 'Notifikasi', icon: Bell },
          { id: 'bantuan', label: 'Bantuan', icon: LifeBuoy },
          { id: 'profil', label: 'Profil UMKM', icon: Store },
        ]
      : [
          { id: 'home', label: 'Beranda', icon: LayoutDashboard },
          { id: 'tawarkan-jasa', label: 'Tawarkan Jasa', icon: Sparkles },
          { id: 'earning', label: 'Earning Hub', icon: Wallet },
          { id: 'proyek-saya', label: 'Pekerjaan Saya', icon: Briefcase },
          { id: 'chat', label: 'Chat', icon: MessageCircle },
          { id: 'notifikasi', label: 'Notifikasi', icon: Bell },
          { id: 'bantuan', label: 'Bantuan', icon: LifeBuoy },
          { id: 'profil', label: 'Profil Mahasiswa', icon: GraduationCap },
          { id: 'portofolio', label: 'Portofolio', icon: Star },
        ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-navy-800 text-white flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-gradient flex items-center justify-center"><Sparkles size={18} className="text-white" /></div>
            <span className="text-lg font-bold">Skillnex</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/60 hover:text-white"><X size={20} /></button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => { onNavigate(item.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${currentPage === item.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
              <item.icon size={18} />
              {item.label}
              {item.id === 'notifikasi' && unreadCount > 0 && <span className="ml-auto px-2 py-0.5 rounded-full bg-sunshine-400 text-navy-900 text-xs font-bold">{unreadCount}</span>}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            {displayFoto ? (
              <img src={displayFoto} alt={displayName} className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-semibold">{getInitials(displayName)}</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{displayName}</div>
              <div className="text-xs text-white/50 capitalize">{role}</div>
            </div>
          </div>
          <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:bg-red-500/20 hover:text-red-300 transition-all">
            <LogOut size={18} /> Keluar
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-navy-900/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-navy-700"><Menu size={24} /></button>
            <h1 className="text-lg font-semibold text-navy-800 capitalize">{menuItems.find((m) => m.id === currentPage)?.label || 'Dashboard'}</h1>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={() => setShowNotif(!showNotif)} className="relative p-2.5 rounded-xl text-navy-600 hover:bg-gray-100 transition-colors">
                  <Bell size={20} />
                  {unreadCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-sunshine-400 text-navy-900 text-xs font-bold flex items-center justify-center">{unreadCount}</span>}
                </button>
                {showNotif && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
                    <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto scrollbar-thin bg-white rounded-2xl shadow-xl border border-gray-200 z-50 animate-slide-down">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <h3 className="font-semibold text-navy-800 text-sm">Notifikasi</h3>
                        {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-emerald-600 font-medium hover:underline">Tandai dibaca</button>}
                      </div>
                      {notifs.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-400"><Bell size={32} className="mx-auto mb-2 text-gray-300" />Belum ada notifikasi</div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {notifs.map((n) => (
                            <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${!n.is_read ? 'bg-emerald-50/50' : ''}`} onClick={() => { if (!n.is_read) (supabase.from('notifications') as any).update({ is_read: true }).eq('id', n.id); setShowNotif(false); if (n.type === 'chat') onOpenChat?.(n.project_id || '', '', ''); else if (n.type === 'payment' || n.type === 'project' || n.type === 'review') onNavigate('proyek-saya'); else if (n.type === 'verification') onNavigate('profil'); else if (n.type === 'withdrawal' || n.type === 'earning') onNavigate('earning'); else onNavigate('home'); }}>
                              <div className="flex items-start gap-2">
                                {!n.is_read && <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-navy-800">{n.title}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">{n.message}</div>
                                  <div className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              {displayFoto ? (
                <img src={displayFoto} alt={displayName} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-navy-100 flex items-center justify-center text-sm font-semibold text-navy-700">{getInitials(displayName)}</div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
