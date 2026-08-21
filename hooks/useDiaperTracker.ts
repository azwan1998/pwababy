'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, FAMILY_ID } from '@/lib/supabase/client';
import { BabyActivity } from '@/lib/supabase/types';
import { playAlertSound } from '@/lib/audioAlert';

export type DiaperType = 'pipis' | 'pup' | 'keduanya';

export function useDiaperTracker() {
  const [diaperLogs, setDiaperLogs] = useState<BabyActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTodayDiapers = useCallback(async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    try {
      setLoading(true);
      const { data } = await supabase
        .from('baby_activities')
        .select('*')
        .eq('family_id', FAMILY_ID)
        .eq('activity_type', 'diaper')
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false });

      if (data) setDiaperLogs(data as BabyActivity[]);
    } catch {
      setDiaperLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayDiapers();

    const channel = supabase
      .channel(`public:baby_activities_diaper:${FAMILY_ID}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'baby_activities', filter: `family_id=eq.${FAMILY_ID}` },
        () => fetchTodayDiapers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTodayDiapers]);

  const logDiaperChange = async (type: DiaperType, notes?: string) => {
    const nowIso = new Date().toISOString();
    const newLog: BabyActivity = {
      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `diaper-${Date.now()}`,
      family_id: FAMILY_ID,
      activity_type: 'diaper',
      duration_minutes: 0,
      started_at: nowIso,
      created_at: nowIso,
      notes: notes || type,
    };

    setDiaperLogs((prev) => [newLog, ...prev]);
    playAlertSound('chime');

    try {
      await supabase.from('baby_activities').insert([newLog]);
    } catch (err) {
      console.warn('Log diaper error:', err);
    }
  };

  const pipisCount = diaperLogs.filter((l) => l.notes === 'pipis' || l.notes === 'keduanya').length;
  const pupCount = diaperLogs.filter((l) => l.notes === 'pup' || l.notes === 'keduanya').length;

  return {
    diaperLogs,
    loading,
    pipisCount,
    pupCount,
    logDiaperChange,
  };
}
