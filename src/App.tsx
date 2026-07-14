import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { FullPageLoader } from './components/ui';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { AdminLoginPage } from './components/AdminLoginPage';
import { AdminDashboard } from './components/AdminDashboard';
import { DashboardLayout, type DashboardPage } from './components/DashboardLayout';
import { CariTalenta } from './components/CariTalenta';
import { TawarkanJasa } from './components/TawarkanJasa';
import { ProyekSaya } from './components/ProyekSaya';
import { ChatPage } from './components/ChatPage';
import { NotifikasiPage } from './components/NotifikasiPage';
import { ProfilPage } from './components/ProfilPage';
import { PortofolioPage } from './components/PortofolioPage';
import { BantuanPage } from './components/BantuanPage';
import { HomePage } from './components/HomePage';
import { EarningHub } from './components/EarningHub';
import { handleOAuthCallback } from './lib/helpers';

type AppView = 'landing' | 'login' | 'register' | 'admin-login' | 'dashboard';

function AppContent() {
  const { user, role, loading, signOut, profileUmkm, profileMahasiswa } = useAuth();
  const [view, setView] = useState<AppView>('landing');
  const [dashboardPage, setDashboardPage] = useState<DashboardPage>('home');
  const [chatInit, setChatInit] = useState<{ projectId: string; receiverId: string; receiverName: string } | null>(null);
  const [projectPrefill, setProjectPrefill] = useState<{ userId: string; id: string; name: string } | null>(null);

  useEffect(() => {
    if (user && (role === 'umkm' || role === 'mahasiswa')) {
      setView('dashboard');
    }
    if (!user && view === 'dashboard') {
      setView('landing');
    }
  }, [user, role]);

  useEffect(() => {
    if (user && !role) {
      handleOAuthCallback(user);
    }
  }, [user, role]);

  if (loading) return <FullPageLoader />;

  if (user && role === 'admin') {
    return <AdminDashboard />;
  }

  // Logged-in user: dashboard layout with all pages
  if (user && (role === 'umkm' || role === 'mahasiswa') && view === 'dashboard') {
    return (
      <DashboardLayout currentPage={dashboardPage} onNavigate={setDashboardPage} onOpenChat={handleOpenChat}>
        {dashboardPage === 'home' && (
          <HomePage
            onNavigate={setDashboardPage}
            onOpenChat={handleOpenChat}
            onOfferProject={handleOfferProject}
          />
        )}
        {dashboardPage === 'cari-talenta' && role === 'umkm' && (
          <CariTalenta onOpenChat={handleOpenChat} onOfferProject={handleOfferProject} />
        )}
        {dashboardPage === 'tawarkan-jasa' && role === 'mahasiswa' && <TawarkanJasa />}
        {dashboardPage === 'proyek-saya' && (
          <ProyekSaya onOpenChat={handleOpenChat} prefillMahasiswa={projectPrefill} onPrefillConsumed={() => setProjectPrefill(null)} />
        )}
        {dashboardPage === 'chat' && (
          <ChatPage initialProjectId={chatInit?.projectId} initialReceiverId={chatInit?.receiverId} initialReceiverName={chatInit?.receiverName} onConsumed={() => setChatInit(null)} />
        )}
        {dashboardPage === 'notifikasi' && <NotifikasiPage onNavigate={setDashboardPage} />}
        {dashboardPage === 'bantuan' && <BantuanPage />}
        {dashboardPage === 'profil' && <ProfilPage />}
        {dashboardPage === 'portofolio' && role === 'mahasiswa' && <PortofolioPage />}
        {dashboardPage === 'earning' && role === 'mahasiswa' && <EarningHub />}
      </DashboardLayout>
    );
  }

  if (view === 'admin-login') {
    return <AdminLoginPage onBack={() => setView('landing')} />;
  }

  if (view === 'login' || view === 'register') {
    return (
      <AuthPage
        mode={view === 'login' ? 'login' : 'register'}
        onBack={() => setView('landing')}
        onSwitchMode={(m) => setView(m)}
        onAdminLogin={() => setView('admin-login')}
      />
    );
  }

  return (
    <LandingPage
      onGetStarted={() => setView('register')}
      onLogin={() => setView('login')}
      isLoggedIn={!!user}
      userDisplayName={role === 'umkm' ? profileUmkm?.nama_umkm : profileMahasiswa?.nama_lengkap}
      onGoDashboard={() => setView('dashboard')}
      onSignOut={async () => { await signOut(); setView('landing'); }}
    />
  );

  function handleOpenChat(projectId: string, receiverId: string, receiverName: string) {
    setChatInit({ projectId, receiverId, receiverName });
    setDashboardPage('chat');
  }

  function handleOfferProject(mahasiswaUserId: string, mahasiswaId: string, mahasiswaName: string) {
    setProjectPrefill({ userId: mahasiswaUserId, id: mahasiswaId, name: mahasiswaName });
    setDashboardPage('proyek-saya');
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
