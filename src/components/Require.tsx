import React from 'react';
import { useAuthCtx } from '../auth';
import type { UserRole } from '../lib/profile';

type RequireProps = {
	children: React.ReactNode;
	perm?: string; // legado: 'exportar', etc.; 'admin' será mapeado para role admin
	nivel?: number; // legado: nível mínimo (sem uso com Supabase profile)
	roles?: UserRole | UserRole[]; // roles aceitas (ex: 'admin')
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

export function Require({ children, perm, nivel, roles }: RequireProps) {
	const { profile } = useAuthCtx();
	const [user, setUser] = React.useState<AuthUser>(() => getAuthUser());

	React.useEffect(() => {
		const sync = () => setUser(getAuthUser());
		const onStorage = (e: StorageEvent) => { if (!e.key || e.key === 'peperaio_auth_user') sync(); };
		window.addEventListener('storage', onStorage);
		window.addEventListener('focus', sync);
		return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('focus', sync); };
	}, []);

	// Se há profile (Supabase), aplicamos regras de role
	if (profile) {
		// roles explícitas
		if (roles) {
			const allowed = Array.isArray(roles) ? roles : [roles];
			if (!allowed.includes(profile.role)) return null;
		}
		// mapeia perm='admin' para role admin
		if (perm === 'admin' && profile.role !== 'admin') return null;
		// nível (legado) ignorado quando usamos profile (sem mapeamento de níveis)
		return <>{children}</>;
	}

	if (!perm && !nivel) return <>{children}</>;
	if (!user) return null;

	if (typeof nivel === 'number' && (user.nivel || 0) < nivel) return null;
	if (perm && !(user.tags || []).includes(perm)) return null;

	return <>{children}</>;
}

export default Require;

