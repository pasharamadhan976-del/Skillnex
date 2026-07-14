import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, MessageCircle, Briefcase, Wallet, Info, Shield, Star, Megaphone, LifeBuoy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Spinner, EmptyState, Button } from './ui';
import type { Notification } from '../lib/types';
import { timeAgo } from '../lib/helpers';
import type { DashboardPage } from './DashboardLayout';

interface NotifikasiPageProps {
  onNavigate: (page: DashboardPage) => void;
}

export function NotifikasiPage({ onNavigate }: NotifikasiPageProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notifs, setNotifs] = useState<Notification[]>([]);

  useEffect(() => { loadNotifs(); }, [user]);

  async function loadNotifs() {
    if (!user) return;
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setNotifs((data as Notification[]) || []);
    setLoading(false);
  }

  async function markAllRead() {
    if (!user) return;
    await (supabase.from('notifications') as any).update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function markRead(id: string) {
    await (supabase.from('notifications') as any).update({ is_read: true }).eq('id', id);
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  async function deleteNotif(id: string) {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }

  function handleClickNotif(n: Notification) {
    if (!n.is_read) markRead(n.id);
    switch (n.type) {
      case 'chat':
        onNavigate('chat');
        break;
      case 'project':
      case 'payment':
      case 'review':
        onNavigate('proyek-saya');
        break;
      case 'verification':
        onNavigate('profil');
        break;
      case 'withdrawal':
      case 'earning':
        onNavigate('earning');
        break;
      case 'broadcast':
        break;
      default:
        onNavigate('home');
    }
  }

  function getNotifIcon(type: string) {
    switch (type) {
      case 'payment': return <Wallet size={18} />;
      case 'project': return <Briefcase size={18} />;
      case 'chat': return <MessageCircle size={18} />;
      case 'review': return <Star size={18} />;
      case 'verification': return <Shield size={18} />;
      case 'withdrawal': return <Wallet size={18} />;
      case 'broadcast': return <Megaphone size={18} />;
      case 'support': return <LifeBuoy size={18} />;
      default: return <Info size={18} />;
    }
  }

  function getNotifColor(type: string) {
    switch (type) {
      case 'payment': return 'bg-emerald-100 text-emerald-600';
      case 'project': return 'bg-navy-100 text-navy-600';
      case 'chat': return 'bg-sunshine-100 text-sunshine-600';
      case 'review': return 'bg-amber-100 text-amber-600';
      case 'verification': return 'bg-blue-100 text-blue-600';
      case 'withdrawal': return 'bg-emerald-100 text-emerald-600';
      case 'broadcast': return 'bg-purple-100 text-purple-600';
      case 'support': return 'bg-red-100 text-red-500';
      default: return 'bg-gray-100 text-gray-500';
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size={32} className="text-emerald-500" /></div>;

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-lg font-semibold text-navy-800">Notifikasi</h2><p className="text-sm text-gray-500">{unreadCount} belum dibaca dari {notifs.length} total</p></div>
        {unreadCount > 0 && <Button variant="outline" onClick={markAllRead}><CheckCheck size={18} /> Tandai Semua Dibaca</Button>}
      </div>
      {notifs.length === 0 ? (
        <EmptyState icon={<Bell size={28} />} title="Belum Ada Notifikasi" description="Notifikasi tentang pekerjaan, pembayaran, dan chat akan muncul di sini." />
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClickNotif(n)}
              className={`card p-4 flex items-start gap-3 group cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all ${!n.is_read ? 'border-emerald-200 bg-emerald-50/30' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getNotifColor(n.type)}`}>
                {getNotifIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-navy-800 text-sm">{n.title}</h3>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="text-xs text-gray-400">{timeAgo(n.created_at)}</div>
                  <span className="text-xs text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Klik untuk melihat →</span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}
                className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
