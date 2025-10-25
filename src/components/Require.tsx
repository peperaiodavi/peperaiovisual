import React from 'react';
import { useAuthCtx } from '../auth';

type RequireProps = {
	children: React.ReactNode;
	perm?: string; // tag de permissão (ex: 'registrar', 'exportar')
	nivel?: number; // nível mínimo (ex: 2)
};

type AuthUser = {
	id: string;
	nome: string;
	email?: string;
	nivel?: number;
	tags?: string[];
} | null;

function getAuthUser(): AuthUser {
	try { return JSON.parse(localStorage.getItem('peperaio_auth_user') || 'null'); } catch { return null; }
}

export function Require({ children, perm, nivel }: RequireProps) {
	const { profile } = useAuthCtx();
	const [user, setUser] = React.useState<AuthUser>(() => getAuthUser());

	React.useEffect(() => {
		const sync = () => setUser(getAuthUser());
		const onStorage = (e: StorageEvent) => { if (!e.key || e.key === 'peperaio_auth_user') sync(); };
		window.addEventListener('storage', onStorage);
		window.addEventListener('focus', sync);
		return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('focus', sync); };
	}, []);

	// Prioridade ao contexto: se há profile autenticado, libera imediatamente
	if (profile) return <>{children}</>;

	if (!perm && !nivel) return <>{children}</>;
	if (!user) return null;

	if (typeof nivel === 'number' && (user.nivel || 0) < nivel) return null;
	if (perm && !(user.tags || []).includes(perm)) return null;

	return <>{children}</>;
}

export default Require;

