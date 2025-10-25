import { supabase } from './supabaseClient';

export type UserRole = 'admin'|'gestor'|'financeiro'|'operacional'|'leitor';
export type Profile = {
  id: string; email: string; name: string | null; avatar_url: string | null;
  role: UserRole; approved: boolean;
};

export async function getAuthUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user ?? null;
}

/**
 * Upserta o profile com base no usuário autenticado.
 * - Garante que email do profiles == email do Auth
 * - Tenta preencher nome e avatar pelas claims do provedor (Google, etc.)
 */
export async function upsertProfileFromAuth(): Promise<Profile> {
  const user = await getAuthUser();
  if (!user) throw new Error('Sem sessão');

  // Busca existente para evitar apagar valores válidos quando Auth não traz
  const { data: existing } = await supabase
    .from('profiles')
    .select('id,email,name,avatar_url,role,approved')
    .eq('id', user.id)
    .single();

  const authEmail = user.email ?? existing?.email ?? null;

  const authNameRaw = (user.user_metadata?.name
    ?? user.user_metadata?.full_name
    ?? user.user_metadata?.nickname
    ?? user.user_metadata?.given_name
    ?? '') as string;
  const authName = authNameRaw?.trim();
  const newName = authName && authName.length > 0 ? authName : (existing?.name ?? null);

  const authAvatarRaw = (user.user_metadata?.avatar_url
    ?? user.user_metadata?.picture
    ?? '') as string;
  const authAvatar = authAvatarRaw?.trim();
  const newAvatar = authAvatar && authAvatar.length > 0 ? authAvatar : (existing?.avatar_url ?? null);

  const payload: any = {
    id: user.id,
    email: authEmail,
    updated_at: new Date().toISOString(),
  };
  if (newName !== null) payload.name = newName;
  if (newAvatar !== null) payload.avatar_url = newAvatar;

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('id,email,name,avatar_url,role,approved')
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function getCurrentProfile(): Promise<Profile|null> {
  console.log('[getCurrentProfile] starting fetch');
  const user = await getAuthUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,name,avatar_url,role,approved')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(patch: { name?: string; avatar_url?: string }) {
  const user = await getAuthUser();
  if (!user) throw new Error('Não autenticado');

  const name = typeof patch.name === 'string' ? patch.name.trim() : undefined;
  const avatar = typeof patch.avatar_url === 'string' ? patch.avatar_url.trim() : undefined;

  const clean: { name?: string; avatar_url?: string; updated_at: string } = {
    ...(name && name.length > 0 ? { name } : {}),
    ...(avatar && avatar.length > 0 ? { avatar_url: avatar } : {}),
    updated_at: new Date().toISOString(),
  };

  if (!('name' in clean) && !('avatar_url' in clean)) return;

  const { error } = await supabase
    .from('profiles')
    .update(clean)
    .eq('id', user.id);

  if (error) throw error;
}

/** Upload de avatar para bucket `avatars` e retorna URL pública assinada */
/** Upload público: salva no bucket `avatars` e retorna URL pública. */
export async function uploadAvatar(file: File): Promise<string> {
  const user = await getAuthUser();
  if (!user) throw new Error('Sem sessão');

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${user.id}/avatar_${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (upErr) throw upErr;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}
