'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, FAMILY_ID } from '@/lib/supabase/client';
import { BabyActivity } from '@/lib/supabase/types';
import { playAlertSound } from '@/lib/audioAlert';

export function useBabySleep() {
  const [sleepLogs, setSleepLogs] = useState<BabyActivity[]>([]);
  const [isSleeping, setIsSleeping] = useState<boolean>(false);
  const [sleepStartMs, setSleepStartMs] = useState<number | null>(null);
  const [lastWakeTimeMs, setLastWakeTimeMs] = useState<number>(Date.now() - 75 * 60 * 1000); // Default 75 min lalu

  const fetchSleepLogs = useCallback(async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    try {
      const { data } = await supabase
        .from('baby_activities')
        .select('*')
        .eq('family_id', FAMILY_ID)
        .eq('activity_type', 'sleep')
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setSleepLogs(data as BabyActivity[]);
        const latest = data[0] as BabyActivity;
        if (!latest.finished_at) {
          setIsSleeping(true);
          setSleepStartMs(new Date(latest.started_at).getTime());
        } else {
          setIsSleeping(false);
          setLastWakeTimeMs(new Date(latest.finished_at).getTime());
        }
      }
    } catch {
      // Mock fallback
      setSleepLogs([
        {
          id: 'sleep-1',
          family_id: FAMILY_ID,
          activity_type: 'sleep',
          duration_minutes: 90,
          started_at: new Date(Date.now() - 165 * 60 * 1000).toISOString(),
          finished_at: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 165 * 60 * 1000).toISOString(),
        },
      ]);
    }
  }, []);

  useEffect(() => {
    fetchSleepLogs();

    const channel = supabase
      .channel(`public:baby_activities_sleep:${FAMILY_ID}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'baby_activities', filter: `family_id=eq.${FAMILY_ID}` },
        () => fetchSleepLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSleepLogs]);

  // Start Sleep Session
  const startSleep = async () => {
    const nowIso = new Date().toISOString();
    setIsSleeping(true);
    setSleepStartMs(Date.now());
    playAlertSound('chime');

    const newLog: BabyActivity = {
      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `sleep-${Date.now()}`,
      family_id: FAMILY_ID,
      activity_type: 'sleep',
      duration_minutes: 0,
      started_at: nowIso,
      created_at: nowIso,
    };

    setSleepLogs((prev) => [newLog, ...prev]);

    try {
      await supabase.from('baby_activities').insert([newLog]);
    } catch (err) {
      console.warn('Start sleep error:', err);
    }
  };

  // Wake Up Action
  const wakeUp = async () => {
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    setIsSleeping(false);
    setLastWakeTimeMs(nowMs);
    playAlertSound('finish');

    const durationMins = sleepStartMs ? Math.max(1, Math.round((nowMs - sleepStartMs) / 60000)) : 60;
    setSleepStartMs(null);

    setSleepLogs((prev) =>
      prev.map((item, idx) => (idx === 0 ? { ...item, duration_minutes: durationMins, finished_at: nowIso } : item))
    );

    try {
      const activeLog = sleepLogs[0];
      if (activeLog?.id) {
        await supabase
          .from('baby_activities')
          .update({ finished_at: nowIso, duration_minutes: durationMins })
          .eq('id', activeLog.id);
      }
    } catch (err) {
      console.warn('Wake up update error:', err);
    }
  };

  const totalSleepMinutesToday = sleepLogs.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);

  return {
    sleepLogs,
    isSleeping,
    sleepStartMs,
    lastWakeTimeMs,
    totalSleepMinutesToday,
    startSleep,
    wakeUp,
  };
}
