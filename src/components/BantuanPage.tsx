import { useState, useEffect } from 'react';
import { LifeBuoy, Plus, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Button, EmptyState, Spinner } from './ui';
import { Modal } from './Modal';
import { TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS, type SupportTicket, type TicketMessage, type TicketCategory } from '../lib/types';
import { timeAgo } from '../lib/helpers';

export function BantuanPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [msgs, setMsgs] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState('');
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', category: 'general' as TicketCategory });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadTickets(); }, [user]);

  async function loadTickets() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('support_tickets').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setTickets((data as SupportTicket[]) || []);
    setLoading(false);
  }

  async function createTicket() {
    if (!user || !newTicket.subject || !newTicket.description) return;
    setSaving(true);
    await (supabase.from('support_tickets') as any).insert({
      user_id: user.id, subject: newTicket.subject, description: newTicket.description,
      category: newTicket.category, status: 'open', priority: 'normal',
    });
    setNewTicket({ subject: '', description: '', category: 'general' });
    setShowCreate(false);
    setSaving(false);
    loadTickets();
  }

  async function openTicket(t: SupportTicket) {
    setSelectedTicket(t);
    setShowDetail(true);
    const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', t.id).order('created_at', { ascending: true });
    setMsgs((data as TicketMessage[]) || []);
  }

  async function sendReply() {
    if (!selectedTicket || !reply.trim() || !user) return;
    await (supabase.from('ticket_messages') as any).insert({ ticket_id: selectedTicket.id, sender_id: user.id, content: reply.trim(), is_from_admin: false });
    setReply('');
    const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', selectedTicket.id).order('created_at', { ascending: true });
    setMsgs((data as TicketMessage[]) || []);
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size={32} className="text-emerald-500" /></div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-navy-800">Pusat Bantuan</h2>
          <p className="text-sm text-gray-500">Hubungi admin untuk bantuan, sengketa, atau pertanyaan</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={18} /> Buat Tiket</Button>
      </div>

      <div className="card p-4 mb-6 bg-emerald-50 border-emerald-200">
        <div className="flex items-start gap-3">
          <LifeBuoy size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-navy-800 text-sm">Butuh bantuan?</h3>
            <p className="text-xs text-gray-600 mt-1">Jika ada kendala dengan proyek, pembayaran, atau sengketa dengan pihak lain, buat tiket dan admin akan segera membantu Anda.</p>
          </div>
        </div>
      </div>

      {tickets.length === 0 ? (
        <EmptyState icon={<LifeBuoy size={28} />} title="Belum Ada Tiket" description="Buat tiket untuk menghubungi admin Skillnex." action={<Button onClick={() => setShowCreate(true)}><Plus size={18} /> Buat Tiket</Button>} />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="card p-4 cursor-pointer hover:border-emerald-300 transition-colors" onClick={() => openTicket(t)}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-navy-800">{t.subject}</h3>
                <span className={`badge ${t.status === 'open' ? 'badge-red' : t.status === 'in_progress' ? 'badge-sunshine' : t.status === 'resolved' ? 'badge-emerald' : 'badge-gray'}`}>{TICKET_STATUS_LABELS[t.status]}</span>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2">{t.description}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span>{TICKET_CATEGORY_LABELS[t.category]}</span>
                <span>·</span>
                <span>{timeAgo(t.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Ticket Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Buat Tiket Bantuan" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Kategori</label>
            <select value={newTicket.category} onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value as TicketCategory })} className="input-field cursor-pointer">
              {Object.entries(TICKET_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Subjek</label>
            <input type="text" value={newTicket.subject} onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })} placeholder="Ringkasan masalah Anda" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Deskripsi</label>
            <textarea value={newTicket.description} onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })} placeholder="Jelaskan masalah Anda secara detail..." rows={4} className="input-field resize-none" />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button className="flex-1" loading={saving} onClick={createTicket} disabled={!newTicket.subject || !newTicket.description}>Kirim Tiket</Button>
          </div>
        </div>
      </Modal>

      {/* Ticket Detail Modal */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title="Detail Tiket" size="md">
        {selectedTicket && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div className="font-semibold text-navy-800">{selectedTicket.subject}</div>
              <div className="text-sm text-gray-500 mt-1">{selectedTicket.description}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge-gray">{TICKET_CATEGORY_LABELS[selectedTicket.category]}</span>
                <span className={`badge ${selectedTicket.status === 'open' ? 'badge-red' : selectedTicket.status === 'in_progress' ? 'badge-sunshine' : 'badge-emerald'}`}>{TICKET_STATUS_LABELS[selectedTicket.status]}</span>
              </div>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
              {msgs.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Belum ada pesan. Admin akan membalas segera.</p> : (
                msgs.map((m) => (
                  <div key={m.id} className={`flex ${m.is_from_admin ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${m.is_from_admin ? 'bg-navy-100 text-navy-800 rounded-bl-md' : 'bg-emerald-500 text-white rounded-br-md'}`}>
                      {m.is_from_admin && <div className="text-xs font-semibold text-navy-600 mb-1">Admin</div>}
                      <p>{m.content}</p>
                      <div className={`text-xs mt-1 ${m.is_from_admin ? 'text-navy-400' : 'text-white/60'}`}>{timeAgo(m.created_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
              <div className="flex gap-2">
                <input type="text" value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendReply()} placeholder="Tulis balasan..." className="input-field flex-1" />
                <Button onClick={sendReply} disabled={!reply.trim()}><Send size={18} /></Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
