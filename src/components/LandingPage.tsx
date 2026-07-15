import { useState } from 'react';
import {
  Search, Shield, Wallet, MessageCircle, Star, ArrowRight,
  CheckCircle2, Users, Briefcase, GraduationCap, Zap, TrendingUp, Quote, Menu, X,
} from 'lucide-react';
import { Button } from './ui';
import { KATEGORI_INDUK } from '../lib/types';
import logoSaya from '../assets/pp.png';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  isLoggedIn?: boolean;
  userDisplayName?: string;
  onGoDashboard?: () => void;
  onSignOut?: () => void;
}

const HERO_BG = 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1920';
const CTA_BG = 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=1920';

const talentaShowcase = [
  { nama: 'Sari Wijaya', universitas: 'Universitas Indonesia', spesialis: 'Desain UI/UX', kategori: 'Desain & Kreatif', rating: 4.9, project: 23, foto: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { nama: 'Budi Santoso', universitas: 'ITB', spesialis: 'Web Development', kategori: 'Teknologi & IT', rating: 4.8, project: 31, foto: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { nama: 'Maya Putri', universitas: 'Universitas Gadjah Mada', spesialis: 'Digital Marketing', kategori: 'Marketing & Bisnis', rating: 5.0, project: 18, foto: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { nama: 'Andi Rahman', universitas: 'Universitas Airlangga', spesialis: 'Content Writing', kategori: 'Konten & Media', rating: 4.7, project: 27, foto: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400' },
];

export function LandingPage({ onGetStarted, onLogin, isLoggedIn, userDisplayName, onGoDashboard, onSignOut }: LandingPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);

  const stats = [
    { label: 'Talenta Terdaftar', value: '1,200+', icon: GraduationCap },
    { label: 'UMKM Mitra', value: '850+', icon: Briefcase },
    { label: 'Proyek Selesai', value: '3,400+', icon: CheckCircle2 },
    { label: 'Rating Rata-rata', value: '4.8/5', icon: Star },
  ];

  const features = [
    { icon: Shield, title: 'Pembayaran Aman dengan Escrow', desc: 'Dana ditahan di escrow hingga proyek selesai dan disetujui. Transparansi penuh untuk kedua belah pihak.', color: 'bg-emerald-50 text-emerald-600' },
    { icon: MessageCircle, title: 'Chat & Negosiasi Langsung', desc: 'UMKM dan mahasiswa berkomunikasi langsung untuk mendiskusikan detail proyek dan negosiasi harga.', color: 'bg-navy-50 text-navy-600' },
    { icon: Wallet, title: 'Multi Metode Pembayaran', desc: 'Bayar dengan QRIS, Transfer Bank, atau E-Wallet. Komisi fair 5-10% dan handling fee hanya 2%.', color: 'bg-sunshine-50 text-sunshine-600' },
    { icon: Star, title: 'Sistem Rating & Portofolio', desc: 'Setiap proyek selesai menambah portofolio mahasiswa. Rating membangun reputasi talenta.', color: 'bg-emerald-50 text-emerald-600' },
    { icon: Search, title: 'Cari Talenta & Tawarkan Jasa', desc: 'UMKM bisa mencari talenta maupun menawarkan pekerjaan. Mahasiswa bisa menawarkan talenta mereka.', color: 'bg-navy-50 text-navy-600' },
    { icon: TrendingUp, title: 'Verifikasi & Kurasi', desc: 'Setiap mahasiswa diverifikasi melalui dokumen dan interview. Hanya talenta terkurasi yang tampil.', color: 'bg-sunshine-50 text-sunshine-600' },
  ];

  const workflow = [
    { step: 1, title: 'Registrasi & Verifikasi', desc: 'UMKM dan Mahasiswa mendaftar, upload dokumen, diverifikasi admin.' },
    { step: 2, title: 'Cari & Tawarkan', desc: 'UMKM cari talenta atau tawarkan pekerjaan. Mahasiswa tawarkan jasa.' },
    { step: 3, title: 'Chat & Negosiasi', desc: 'Diskusi detail proyek, scope, deadline, dan harga via chat.' },
    { step: 4, title: 'Pembayaran ke Escrow', desc: 'UMKM bayar via QRIS/Transfer/E-Wallet. Dana aman di escrow.' },
    { step: 5, title: 'Pengerjaan Proyek', desc: 'Mahasiswa mengerjakan. Notifikasi otomatis di setiap tahap.' },
    { step: 6, title: 'Review & Revisi', desc: 'UMKM cek hasil. Revisi jika perlu. Konfirmasi jika disetujui.' },
    { step: 7, title: 'Dana Dilepas', desc: 'Komisi & handling fee dipotong otomatis. Dana masuk ke mahasiswa.' },
    { step: 8, title: 'Rating & Portofolio', desc: 'UMKM beri rating. Portofolio mahasiswa bertambah otomatis.' },
  ];

  const testimonials = [
    { nama: 'Pak Joko', bisnis: 'Toko Kopi Senja', text: 'Skillnex membantu saya menemukan talenta muda untuk mendesain logo dan branding toko. Prosesnya aman dan hasilnya memuaskan!', rating: 5 },
    { nama: 'Dewi Lestari', bisnis: 'Dewi Batik', text: 'Saya butuh mahasiswa untuk mengelola social media. Di Skillnex, saya bisa chat langsung, negosiasi, dan pembayaran terjamin.', rating: 5 },
    { nama: 'Rian Pratama', bisnis: 'Kopi Rian', text: 'Sistem escrow-nya bikin tenang. Dana baru dilepas setelah proyek selesai dan saya setuju. Sangat profesional.', rating: 5 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar - fixed, solid background, no overlap */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl  flex items-center justify-center">
<img src={logoSaya} alt="Logo" className="w-8 h-8 object-contain" />
              </div>
              <span className="text-xl font-bold text-navy-800">Skillnext</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#fitur" className="text-sm font-medium text-navy-600 hover:text-emerald-600 transition-colors">Fitur</a>
              <a href="#cara-kerja" className="text-sm font-medium text-navy-600 hover:text-emerald-600 transition-colors">Cara Kerja</a>
              <a href="#talenta" className="text-sm font-medium text-navy-600 hover:text-emerald-600 transition-colors">Talenta</a>
              <a href="#testimoni" className="text-sm font-medium text-navy-600 hover:text-emerald-600 transition-colors">Testimoni</a>
            </div>
            <div className="hidden md:flex items-center gap-3">
              {isLoggedIn ? (
                <>
                  <span className="text-sm text-gray-500">Halo, <span className="font-medium text-navy-700">{userDisplayName}</span></span>
                  <Button onClick={onGoDashboard}>Dashboard</Button>
                  <Button variant="ghost" onClick={onSignOut}>Keluar</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={onLogin}>Masuk</Button>
                  <Button onClick={onGetStarted}>Mulai</Button>
                </>
              )}
            </div>
            <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 text-navy-700">
              {mobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {mobileMenu && (
          <div className="md:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-3 animate-slide-down">
            <a href="#fitur" onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-navy-600 hover:text-emerald-600">Fitur</a>
            <a href="#cara-kerja" onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-navy-600 hover:text-emerald-600">Cara Kerja</a>
            <a href="#talenta" onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-navy-600 hover:text-emerald-600">Talenta</a>
            <a href="#testimoni" onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-navy-600 hover:text-emerald-600">Testimoni</a>
            <div className="flex gap-3 pt-2">
              {isLoggedIn ? (
                <>
                  <Button className="flex-1" onClick={onGoDashboard}>Dashboard</Button>
                  <Button variant="outline" className="flex-1" onClick={onSignOut}>Keluar</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="flex-1" onClick={onLogin}>Masuk</Button>
                  <Button className="flex-1" onClick={onGetStarted}>Mulai</Button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero - with top padding to clear fixed navbar */}
      <section className="relative overflow-hidden min-h-[600px] flex items-center pt-16">
        <div className="absolute inset-0">
          <img src={HERO_BG} alt="Background" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-navy-900/95 via-navy-800/90 to-emerald-900/80" />
        </div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-sunshine-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 text-white w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
                <Zap size={16} className="text-sunshine-400" />
                <span className="text-sm font-medium text-white/90">Marketplace Talenta #1 untuk UMKM</span>
              </div>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight mb-6 text-balance">
                Hubungkan <span className="text-emerald-400">UMKM</span> dengan <span className="text-sunshine-400">Talent Mahasiswa</span>
              </h1>
              <p className="text-lg text-white/70 mb-8 max-w-xl leading-relaxed">
                Platform marketplace yang menghubungkan UMKM dengan talenta mahasiswa secara transparan, aman, dan profesional. Pembayaran escrow, chat langsung, dan portofolio terkurasi.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button onClick={onGetStarted} className="px-7 py-3.5 text-base">
                  {isLoggedIn ? 'Mulai Berkolaborasi' : 'Cari Talenta Sekarang'} <ArrowRight size={20} />
                </Button>
                <Button variant="outline" onClick={onLogin} className="px-7 py-3.5 text-base border-white/30 text-white hover:border-white hover:bg-white/10">
                  {isLoggedIn ? 'Lihat Proyek Saya' : 'Saya Mahasiswa'}
                </Button>
              </div>
              <div className="relative max-w-lg">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari skill: desain, programming, marketing..." className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-all" />
              </div>
            </div>
            <div className="relative animate-slide-up hidden lg:block">
              <div className="grid grid-cols-2 gap-4">
                {talentaShowcase.map((t, i) => (
                  <div key={i} className={`glass-dark rounded-2xl p-4 ${i % 2 === 0 ? 'mt-8' : ''} hover:scale-105 transition-transform duration-300 cursor-pointer`}>
                    <img src={t.foto} alt={t.nama} className="w-full h-32 object-cover rounded-xl mb-3" />
                    <h3 className="font-semibold text-white text-sm">{t.nama}</h3>
                    <p className="text-xs text-white/60 mb-1">{t.universitas}</p>
                    <div className="mb-1"><span className="text-sm font-medium text-emerald-400">{t.spesialis}</span></div>
                    <div className="mb-2"><span className="text-xs text-white/50">{t.kategori}</span></div>
                    <div className="flex items-center justify-between text-xs text-white/70">
                      <span className="flex items-center gap-1"><Star size={12} className="fill-sunshine-400 text-sunshine-400" />{t.rating}</span>
                      <span>{t.project} proyek</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3"><s.icon size={24} className="text-emerald-600" /></div>
                <div className="text-2xl lg:text-3xl font-bold text-navy-800">{s.value}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Kategori Skills */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-navy-800 mb-3">Kategori Talenta</h2>
            <p className="text-gray-500">Temukan talenta mahasiswa dari berbagai bidang keahlian</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {KATEGORI_INDUK.map((kat, i) => (
              <div key={i} className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-navy-700 font-medium text-sm hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">{kat}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="fitur" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-navy-800 mb-3">Mengapa Skillnext?</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Platform end-to-end dengan keamanan escrow, chat real-time, dan sistem reputasi yang terpercaya</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="card card-hover p-6">
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}><f.icon size={24} /></div>
                <h3 className="text-lg font-semibold text-navy-800 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="cara-kerja" className="py-20 bg-navy-gradient text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Cara Kerja Skillnext</h2>
            <p className="text-white/60 max-w-2xl mx-auto">8 langkah transparan dari registrasi hingga proyek selesai</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflow.map((w, i) => (
              <div key={i} className="relative">
                <div className="glass-dark rounded-2xl p-6 h-full">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-bold text-white mb-4">{w.step}</div>
                  <h3 className="font-semibold text-white mb-2">{w.title}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{w.desc}</p>
                </div>
                {i < workflow.length - 1 && <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-white/20" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Talenta Showcase */}
      <section id="talenta" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-navy-800 mb-3">Talenta Pilihan</h2>
            <p className="text-gray-500">Mahasiswa terkurasi dengan rating tertinggi dan portofolio terbukti</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {talentaShowcase.map((t, i) => (
              <div key={i} className="card card-hover overflow-hidden group">
                <div className="relative h-48 overflow-hidden">
                  <img src={t.foto} alt={t.nama} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute top-3 right-3 badge-emerald"><Star size={12} className="fill-sunshine-400 text-sunshine-400" />{t.rating}</div>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-navy-800">{t.nama}</h3>
                  <p className="text-sm text-gray-500 mb-2">{t.universitas}</p>
                  <div className="mb-1"><span className="text-sm font-medium text-navy-700">{t.spesialis}</span></div>
                  <div className="mb-3"><span className="text-xs text-gray-400">{t.kategori}</span></div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Briefcase size={14} />{t.project} proyek</span>
                    <Button variant="outline" className="!px-3 !py-1.5 !text-xs" onClick={onGetStarted}>Lihat Profil</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimoni" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-navy-800 mb-3">Apa Kata UMKM?</h2>
            <p className="text-gray-500">Cerita nyata dari mitra UMKM yang sudah merasakan Skillnext</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="card p-6">
                <Quote size={32} className="text-emerald-200 mb-4" />
                <p className="text-navy-700 leading-relaxed mb-4 text-sm">"{t.text}"</p>
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => <Star key={j} size={16} className="fill-sunshine-400 text-sunshine-400" />)}
                </div>
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold">{t.nama.charAt(0)}</div>
                  <div><div className="font-semibold text-navy-800 text-sm">{t.nama}</div><div className="text-xs text-gray-500">{t.bisnis}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA with background */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img src={CTA_BG} alt="Background" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/95 to-emerald-500/90" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <Users size={48} className="mx-auto mb-6 text-white/90" />
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Siap Memulai Perjalanan Anda?</h2>
          <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">Bergabung dengan ribuan UMKM dan mahasiswa yang sudah membangun kolaborasi sukses di Skillnex</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={onGetStarted} className="px-8 py-3.5 text-base bg-white text-emerald-600 hover:bg-gray-50 hover:shadow-xl">{isLoggedIn ? 'Jelajahi Marketplace' : 'Daftar sebagai UMKM'} <ArrowRight size={20} /></Button>
            <Button onClick={onLogin} className="px-8 py-3.5 text-base bg-navy-800 text-white hover:bg-navy-700 hover:shadow-xl">{isLoggedIn ? 'Proyek Saya' : 'Daftar sebagai Mahasiswa'}</Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-900 text-white/60 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg  flex items-center justify-center bg-white">
                  <img src={logoSaya} alt="Logo" className="w-8 h-8 object-contain" />
                  </div>
                <span className="text-lg font-bold text-white">Skillnext</span>
              </div>
              <p className="text-sm">Marketplace talenta yang menghubungkan UMKM dengan mahasiswa secara aman dan profesional.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li className="hover:text-emerald-400 cursor-pointer transition-colors">Cari Talenta</li>
                <li className="hover:text-emerald-400 cursor-pointer transition-colors">Tawarkan Pekerjaan</li>
                <li className="hover:text-emerald-400 cursor-pointer transition-colors">Jadi Talenta</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Perusahaan</h4>
              <ul className="space-y-2 text-sm">
                <li className="hover:text-emerald-400 cursor-pointer transition-colors">Tentang Kami</li>
                <li className="hover:text-emerald-400 cursor-pointer transition-colors">Cara Kerja</li>
                <li className="hover:text-emerald-400 cursor-pointer transition-colors">Kebijakan Privasi</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Dukungan</h4>
              <ul className="space-y-2 text-sm">
                <li className="hover:text-emerald-400 cursor-pointer transition-colors">Bantuan</li>
                <li className="hover:text-emerald-400 cursor-pointer transition-colors">Syarat & Ketentuan</li>
                <li className="hover:text-emerald-400 cursor-pointer transition-colors">Hubungi Kami</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 text-center text-sm">
            <p>&copy; 2026 Skillnext. Semua hak dilindungi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
