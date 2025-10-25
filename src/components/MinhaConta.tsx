import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Save, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { useAuthCtx } from '../auth';
import { updateProfile, uploadAvatar } from '../lib/profile';
import { supabase } from '../lib/supabaseClient';

export function MinhaConta() {
  const { profile, refreshProfile } = useAuthCtx();
  const [name, setName] = useState(profile?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (!profile) {
    return <div className="p-6">Carregando perfil…</div>;
  }

  // Hidrata o input quando o profile for carregado/atualizado
  useEffect(() => {
    setName(profile?.name ?? '');
  }, [profile]);

  const onSave = async () => {
    setSaving(true);
    try {
      const next = name.trim();
      await updateProfile({ name: next });
      await refreshProfile();
      toast.success('✔️ Alterações salvas com sucesso!');
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(f);
      await updateProfile({ avatar_url: url });
      await refreshProfile();
      toast.success('Foto atualizada!');
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao enviar avatar');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl mb-1">Minha Conta</h1>
        <p className="text-[#626262]">Gerencie suas informações pessoais</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-8 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          {/* Foto de perfil */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-[#4F6139] to-[#9DBF7B] rounded-full flex items-center justify-center text-white text-3xl transition-transform group-hover:scale-105">
                  U
                </div>
              )}
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-[#D8C39E] rounded-full flex items-center justify-center hover:bg-[#c9b38d] transition-all hover:scale-110 cursor-pointer">
                <Camera className="h-4 w-4 text-[#2C2C2C]" />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={onAvatar}
                  disabled={uploading}
                />
              </label>
            </div>
            <p className="text-sm text-[#626262] mt-3">Clique para alterar foto</p>
          </div>

          {/* Formulário */}
          <div className="space-y-6">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="rounded-xl h-12 bg-[#F8F7F4] cursor-not-allowed"
              />
              <p className="text-xs text-[#626262] mt-1">O e-mail não pode ser alterado</p>
            </div>

            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                className="rounded-xl h-12"
              />
            </div>

            <Button
              onClick={onSave}
              disabled={saving}
              className="w-full bg-[#4F6139] hover:bg-[#3e4d2d] text-white rounded-xl h-12 transition-all hover:scale-105 disabled:opacity-60"
            >
              <Save className="h-5 w-5 mr-2" />
              {saving ? 'Salvando…' : 'Salvar Alterações'}
            </Button>

            <div className="h-px bg-[#E8E6E0]" />

            <Button
              onClick={async () => {
                setLoggingOut(true);
                try {
                  await supabase.auth.signOut();
                  toast.success('Você saiu da conta');
                } catch (e: any) {
                  toast.error(e?.message || 'Não foi possível sair');
                } finally {
                  setLoggingOut(false);
                }
              }}
              disabled={loggingOut}
              className="w-full bg-[#B64B3A] hover:bg-[#a24031] text-white rounded-xl h-12 transition-all hover:scale-[1.02] disabled:opacity-60"
            >
              <LogOut className="h-5 w-5 mr-2" />
              {loggingOut ? 'Saindo…' : 'Sair da conta'}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

