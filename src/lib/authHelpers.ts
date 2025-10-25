import { supabase } from './supabaseClient';

export type UserRole = 'admin' | 'gestor' | 'financeiro' | 'operacional' | 'leitor';

export type Profile = {
  id: string;
  email: string; // vem de auth.users
  name: string | null;
  avatar_url: string | null;
  role: UserRole;
  approved: boolean;
};

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Seleciona apenas colunas existentes na tabela profiles; email vem de auth.users
  const { data, error, status } = await supabase
    .from('profiles')
    .select('id,name,avatar_url,role,approved')
    .eq('id', user.id)
    .maybeSingle();

  if (error && status !== 406) {
    // 406 = nenhuma linha encontrada quando usando maybeSingle; tratamos como null
    throw error;
  }

  if (!data) return null;
  return { ...data, email: user.email || '' } as Profile;
}

export async function requireApproved(): Promise<Profile> {
  const p = await getCurrentProfile();
  if (!p || !p.approved) {
    await supabase.auth.signOut();
    throw new Error('Usuário não autorizado. Contate o administrador.');
  }
  return p;
}

export function hasRole(p: Profile | null, required: UserRole | UserRole[]): boolean {
  if (!p) return false;
  const need = Array.isArray(required) ? required : [required];
  return need.includes(p.role);
}
