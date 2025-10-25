import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { Profile, upsertProfileFromAuth, getCurrentProfile } from './lib/profile';

type AuthCtx = {
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({ profile: null, loading: true, refreshProfile: async () => {} });
export const useAuthCtx = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    const p = await getCurrentProfile().catch(() => null);
    setProfile(p);
  };

  useEffect(() => {
    let active = true;
    const end = () => active && setLoading(false);

    const boot = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[auth] session?', session);
        console.log('[auth] profile before refresh', profile);
        if (session) {
          try {
            await upsertProfileFromAuth();
            await refreshProfile();
          } catch {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      } finally {
        end();
      }
    };

    boot();

    const safety = setTimeout(end, 6000);

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
      console.log('[auth] session?', session);
      console.log('[auth] profile before refresh', profile);
      if (session) {
        upsertProfileFromAuth()
          .then(refreshProfile)
          .catch(() => setProfile(null))
          .finally(end);
      } else {
        setProfile(null);
        end();
      }
    });

    return () => {
      active = false;
      clearTimeout(safety);
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
