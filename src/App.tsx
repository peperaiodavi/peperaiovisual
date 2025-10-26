import React, { useState, useEffect, Suspense } from 'react';
import { AnimatePresence } from 'motion/react';
import { Toaster } from './components/ui/sonner';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Funcionarios } from './components/Funcionarios';
import { Equipes } from './components/Equipes';
// Lazy-load telas pesadas
const ControleFinanceiro = React.lazy(() => import('./components/ControleFinanceiro').then(m => ({ default: m.ControleFinanceiro })));
const AutomacaoPDF2 = React.lazy(() => import('./components/AutomacaoPDF2'));
import { MinhaConta } from './components/MinhaConta';
import { supabase } from './lib/supabaseClient';
import { useAuthCtx } from './auth';

export default function App() {
  const { loading, profile } = useAuthCtx();
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Navegação por evento customizado
  useEffect(() => {
    const onNav = (e: Event) => {
      const ev = e as CustomEvent<{ page: string; params?: Record<string, any> }>;
      if (ev?.detail?.page) setCurrentPage(ev.detail.page);
    };
    window.addEventListener('peperaio_navigate', onNav as EventListener);
    return () => window.removeEventListener('peperaio_navigate', onNav as EventListener);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentPage('dashboard');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      
      case 'funcionarios':
        return <Funcionarios />;
      case 'equipes':
        return <Equipes />;
      case 'financeiro':
        return (
          <Suspense fallback={<div style={{ padding: 24, color: '#626262' }}>Carregando Financeiro…</div>}>
            <ControleFinanceiro />
          </Suspense>
        );
      case 'pdf':
        if (profile?.role !== 'admin') return <div style={{ padding: 24, color: '#626262' }}>Acesso negado</div>;
        return (
          <Suspense fallback={<div style={{ padding: 24, color: '#626262' }}>Carregando PDF…</div>}>
            <AutomacaoPDF2 />
          </Suspense>
        );
      case 'conta':
        return <MinhaConta />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return <div style={{ padding: 24, color: '#626262' }}>Carregando…</div>;
  }

  if (!profile || !profile.approved) {
    return (
      <>
        <Login />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <Layout
        currentPage={currentPage}
        onNavigate={(p) => setCurrentPage(p)}
        onLogout={handleLogout}
      >
        <AnimatePresence mode="wait">
          {renderPage()}
        </AnimatePresence>
      </Layout>
      <Toaster />
    </>
  );
}
