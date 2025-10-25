import React from 'react';
import { useAuthCtx } from '../auth';
import { Login } from './Login';

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  pending?: React.ReactNode;
};

export function RequireSession({ children, fallback = <Login />, pending = <div className="p-6">Carregando…</div> }: Props) {
  const { loading, profile } = useAuthCtx();

  if (loading) return <>{pending}</>;
  if (!profile) return <>{fallback}</>;
  if ((profile as any).approved === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <h2 className="text-xl mb-2">Sua conta aguarda aprovação</h2>
          <p className="text-[#626262]">Fale com o administrador para liberar o acesso.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export default RequireSession;
