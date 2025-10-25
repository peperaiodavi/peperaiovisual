import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { supabase } from '../lib/supabaseClient';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Preview de avatar opcional via função edge/env, resiliente a erros
  const EDGE_URL = (import.meta as any).env?.VITE_LOGIN_AVATAR_URL as string | undefined;
  const emailOk = /.+@.+\..+/.test(email);

  React.useEffect(() => {
    if (!emailOk || !EDGE_URL) { setAvatarPreview(null); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(EDGE_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email })
        });
        if (!res.ok) { setAvatarPreview(null); return; }
        const json = await res.json().catch(() => ({ avatar_url: null }));
        setAvatarPreview(json?.avatar_url || null);
      } catch {
        setAvatarPreview(null);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [email, emailOk, EDGE_URL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Força o contexto a reidratar (AuthProvider escuta onAuthStateChange)
      window.location.reload();
    } catch (e: any) {
      setErr(e?.message || 'Falha no login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#4F6139] via-[#6B7F52] to-[#D8C39E] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.1)] p-8 md:p-10">
          <div className="text-center mb-8">
            <img
              src="/logo2.png"
              alt="Logo Peperaio"
              className="w-16 h-16 object-contain mx-auto mb-4 rounded-full bg-white shadow-sm"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/Logo.png';
              }}
            />
            <h1 className="text-2xl mb-2 text-[#2C2C2C]">Peperaio Comunicação Visual</h1>
            <p className="text-[#626262]">Bem-vindo à gestão da Peperaio</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="h-12 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 rounded-xl"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#4F6139] hover:bg-[#3e4d2d] text-white rounded-xl transition-all duration-300 hover:scale-105 active:scale-97 disabled:opacity-60"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
            {err && (
              <div className="text-sm text-[#B64B3A] mt-1">{err}</div>
            )}
          </form>
        </div>

        <div className="text-center mt-6 text-white text-sm">
          Peperaio © 2025
        </div>
      </motion.div>
    </div>
  );
}
