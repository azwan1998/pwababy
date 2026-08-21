'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, FAMILY_ID } from '@/lib/supabase/client';
import { BabyProfile } from '@/lib/supabase/types';

export function useBabyProfile() {
  const [profile, setProfile] = useState<BabyProfile>({
    family_id: FAMILY_ID,
    baby_name: 'Si Kecil',
    birth_date: '2026-06-01',
    weight_kg: 5.2,
  });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      // Gunakan .maybeSingle() agar tidak memicu HTTP 406 saat baris belum ada di DB
      const { data, error } = await supabase
        .from('baby_profiles')
        .select('*')
        .eq('family_id', FAMILY_ID)
        .maybeSingle();

      if (error) {
        console.warn('Fetch baby profile warning:', error.message);
      }

      if (data) {
        setProfile({
          id: data.id,
          family_id: data.family_id,
          baby_name: data.baby_name || 'Si Kecil',
          birth_date: data.birth_date || '2026-06-01',
          weight_kg: Number(data.weight_kg) || 5.2,
        });
      }
    } catch (err) {
      console.warn('Fetch baby profile exception:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Realtime subscription dengan channel ID unik per mount untuk mencegah callback error
  useEffect(() => {
    fetchProfile();

    const channelName = `realtime:baby_profiles:${FAMILY_ID}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'baby_profiles', filter: `family_id=eq.${FAMILY_ID}` },
        () => fetchProfile()
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProfile]);

  const updateProfile = async (newProfile: Partial<BabyProfile>) => {
    const updated: BabyProfile = {
      ...profile,
      ...newProfile,
      family_id: FAMILY_ID,
    };

    setProfile(updated);

    try {
      const { error } = await supabase
        .from('baby_profiles')
        .upsert(
          [
            {
              family_id: FAMILY_ID,
              baby_name: updated.baby_name,
              birth_date: updated.birth_date,
              weight_kg: updated.weight_kg,
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'family_id' }
        );

      if (error) throw error;
    } catch (err) {
      console.warn('Upsert baby profile error:', err);
    }
  };

  return {
    profile,
    loading,
    updateProfile,
    refresh: fetchProfile,
  };
}
