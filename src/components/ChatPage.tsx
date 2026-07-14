import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Button, EmptyState, Spinner } from './ui';
import { getInitials, timeAgo, createNotification } from '../lib/helpers';
import type { Message, Project, ProfileUmkm, ProfileMahasiswa } from '../lib/types';

interface ChatPageProps {
  initialProjectId?: string;
  initialReceiverId?: string;
  initialReceiverName?: string;
  onConsumed?: () => void;
}

interface Conversation {
  projectId: string;
  projectTitle: string;
  otherUserId: string;
  otherUserName: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
}

export function ChatPage({ initialProjectId, initialReceiverId, initialReceiverName, onConsumed }: ChatPageProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadConversations(); }, [user]);

  useEffect(() => {
    if (initialProjectId && initialReceiverId) {
      handleNewChat(initialProjectId, initialReceiverId, initialReceiverName || '');
      onConsumed?.();
    }
  }, [initialProjectId, initialReceiverId]);

  useEffect(() => {
    if (!selectedConv) return;
    loadMessages(selectedConv.projectId);
    const channel = supabase
      .channel(`messages-${selectedConv.projectId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${selectedConv.projectId}` }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => [...prev, newMsg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConv]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function loadConversations() {
    if (!user) return;
    setLoading(true);
    const { data: projects } = await supabase.from('projects').select('*').or(`umkm_user_id.eq.${user.id},mahasiswa_user_id.eq.${user.id}`).order('updated_at', { ascending: false });
    if (!projects) { setConversations([]); setLoading(false); return; }
    const convos: Conversation[] = [];
    for (const p of projects as Project[]) {
      const otherUserId = p.umkm_user_id === user.id ? p.mahasiswa_user_id : p.umkm_user_id;
      if (!otherUserId) continue;
      let otherUserName = '';
      if (p.umkm_user_id === user.id) {
        const { data: mhs } = await supabase.from('profiles_mahasiswa').select('nama_lengkap').eq('user_id', otherUserId).maybeSingle();
        otherUserName = (mhs as ProfileMahasiswa | null)?.nama_lengkap || 'Mahasiswa';
      } else {
        const { data: umkm } = await supabase.from('profiles_umkm').select('nama_umkm').eq('user_id', otherUserId).maybeSingle();
        otherUserName = (umkm as ProfileUmkm | null)?.nama_umkm || 'UMKM';
      }
      const { data: msgs } = await supabase.from('messages').select('*').eq('project_id', p.id).order('created_at', { ascending: false }).limit(1);
      const lastMsg = (msgs as Message[])?.[0];
      const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('project_id', p.id).eq('receiver_id', user.id).eq('is_read', false);
      convos.push({ projectId: p.id, projectTitle: p.judul, otherUserId, otherUserName, lastMessage: lastMsg?.content || 'Mulai percakapan', lastTime: lastMsg?.created_at || p.created_at, unread: count || 0 });
    }
    setConversations(convos);
    setLoading(false);
  }

  async function loadMessages(projectId: string) {
    if (!user) return;
    setLoadingMessages(true);
    const { data } = await supabase.from('messages').select('*').eq('project_id', projectId).or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', { ascending: true });
    setMessages((data as Message[]) || []);
    await (supabase.from('messages') as any).update({ is_read: true }).eq('project_id', projectId).eq('receiver_id', user.id).eq('is_read', false);
    setLoadingMessages(false);
  }

  async function handleNewChat(projectId: string, receiverId: string, receiverName: string) {
    if (!user) return;
    const { data: existing } = await supabase.from('projects').select('judul').eq('id', projectId).maybeSingle();
    const conv: Conversation = { projectId, projectTitle: (existing as { judul: string } | null)?.judul || 'Percakapan Baru', otherUserId: receiverId, otherUserName: receiverName, lastMessage: '', lastTime: new Date().toISOString(), unread: 0 };
    const exists = conversations.find((c) => c.projectId === projectId);
    if (!exists) setConversations((prev) => [conv, ...prev]);
    setSelectedConv(conv);
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConv || !user) return;
    const { data } = await (supabase.from('messages') as any).insert({ project_id: selectedConv.projectId, sender_id: user.id, receiver_id: selectedConv.otherUserId, content: newMessage.trim(), is_read: false }).select().single();
    if (data) { setMessages((prev) => [...prev, data as Message]); setNewMessage(''); }
    await createNotification(selectedConv.otherUserId, 'chat', 'Pesan Baru', `Anda mendapat pesan baru dari percakapan "${selectedConv.projectTitle}"`, selectedConv.projectId);
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size={32} className="text-emerald-500" /></div>;

  return (
    <div className="card overflow-hidden h-[calc(100vh-140px)] flex">
      <div className={`w-full md:w-80 border-r border-gray-200 flex flex-col ${selectedConv ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 py-3 border-b border-gray-100"><h2 className="font-semibold text-navy-800">Percakapan</h2></div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {conversations.length === 0 ? (
            <EmptyState icon={<MessageCircle size={28} />} title="Belum Ada Chat" description="Mulai chat dari halaman Cari Talenta atau Proyek Saya." />
          ) : (
            conversations.map((c) => (
              <button key={c.projectId} onClick={() => setSelectedConv(c)} className={`w-full flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left ${selectedConv?.projectId === c.projectId ? 'bg-emerald-50' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center text-sm font-semibold text-navy-700 flex-shrink-0">{getInitials(c.otherUserName)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-navy-800 text-sm truncate">{c.otherUserName}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(c.lastTime)}</span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">{c.projectTitle}</div>
                  <div className="text-xs text-gray-400 truncate mt-0.5">{c.lastMessage}</div>
                </div>
                {c.unread > 0 && <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-xs font-bold flex-shrink-0">{c.unread}</span>}
              </button>
            ))
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col ${selectedConv ? 'flex' : 'hidden md:flex'}`}>
        {selectedConv ? (
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <button onClick={() => setSelectedConv(null)} className="md:hidden text-navy-600"><ArrowLeft size={20} /></button>
              <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center text-sm font-semibold text-navy-700">{getInitials(selectedConv.otherUserName)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-navy-800 text-sm">{selectedConv.otherUserName}</div>
                <div className="text-xs text-gray-500 truncate">{selectedConv.projectTitle}</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3 bg-gray-50">
              {loadingMessages ? (
                <div className="flex justify-center py-8"><Spinner size={24} className="text-emerald-500" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400"><MessageCircle size={32} className="mx-auto mb-2 text-gray-300" />Mulai percakapan</div>
              ) : (
                messages.map((m) => {
                  const isOwn = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isOwn ? 'bg-emerald-500 text-white rounded-br-md' : 'bg-white text-navy-800 border border-gray-200 rounded-bl-md'}`}>
                        <p>{m.content}</p>
                        <div className={`text-xs mt-1 ${isOwn ? 'text-white/60' : 'text-gray-400'}`}>{timeAgo(m.created_at)}</div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-gray-100 flex items-center gap-2">
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Ketik pesan..." className="input-field flex-1" />
              <Button onClick={sendMessage} disabled={!newMessage.trim()} className="!px-4 !py-3"><Send size={18} /></Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState icon={<MessageCircle size={28} />} title="Pilih Percakapan" description="Pilih percakapan dari daftar untuk mulai chat." />
          </div>
        )}
      </div>
    </div>
  );
}
