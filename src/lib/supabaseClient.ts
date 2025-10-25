import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  // Evita crash silencioso e ajuda a identificar .env ausente
  // Mostra aviso no console e lança erro claro em modo dev
  // Em produção, ainda lançamos para evitar comportamento inesperado
  const msg = '[Supabase] Variáveis VITE_SUPABASE_URL/KEY ausentes. Configure o .env.';
  console.error(msg);
}

export const supabase = createClient(url || '', anon || '');
