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

  // Helper untuk menyimpan ke localStorage sebagai backup offline
  const saveLocal = (data: BabyProfile) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pwababy_name', data.baby_name);
      localStorage.setItem('pwababy_dob', data.birth_date);
      localStorage.setItem('pwababy_weight', data.weight_kg.toString());
    }
  };

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('baby_profiles')
        .select('*')
        .eq('family_id', FAMILY_ID)
        .single();

      if (data) {
        const loaded: BabyProfile = {
          id: data.id,
          family_id: data.family_id,
          baby_name: data.baby_name || 'Si Kecil',
          birth_date: data.birth_date || '2026-06-01',
          weight_kg: Number(data.weight_kg) || 5.2,
        };
        setProfile(loaded);
        saveLocal(loaded);
      } else {
        // Fallback dari localStorage jika tabel Supabase belum ada barisnya
        if (typeof window !== 'undefined') {
          const savedName = localStorage.getItem('pwababy_name');
          const savedDob = localStorage.getItem('pwababy_dob');
          const savedWeight = localStorage.getItem('pwababy_weight');
          if (savedName || savedDob || savedWeight) {
            setProfile({
              family_id: FAMILY_ID,
              baby_name: savedName || 'Si Kecil',
              birth_date: savedDob || '2026-06-01',
              weight_kg: savedWeight ? parseFloat(savedWeight) : 5.2,
            });
          }
        }
      }
    } catch (err) {
      console.warn('Fetch baby profile fallback:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Realtime subscription untuk update profil bayi antara HP Ayah & Ibu
  useEffect(() => {
    fetchProfile();

    const channel = supabase
      .channel(`public:baby_profiles:${FAMILY_ID}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'baby_profiles', filter: `family_id=eq.${FAMILY_ID}` },
        () => fetchProfile()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProfile]);

  // Action untuk update profil di DB Supabase & Realtime
  const updateProfile = async (newProfile: Partial<BabyProfile>) => {
    const updated: BabyProfile = {
      ...profile,
      ...newProfile,
      family_id: FAMILY_ID,
    };

    setProfile(updated);
    saveLocal(updated);

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
      console.warn('Upsert baby profile warning, saved locally:', err);
    }
  };

  return {
    profile,
    loading,
    updateProfile,
    refresh: fetchProfile,
  };
}
