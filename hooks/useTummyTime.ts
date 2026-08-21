'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, FAMILY_ID } from '@/lib/supabase/client';
import { BabyActivity } from '@/lib/supabase/types';
import { playAlertSound } from '@/lib/audioAlert';

export function useTummyTime() {
  const [activities, setActivities] = useState<BabyActivity[]>([]);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [targetSessions] = useState<number>(4); // Target 3-5 sesi / hari

  const fetchTodayTummyTime = useCallback(async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    try {
      const { data, error } = await supabase
        .from('baby_activities')
        .select('*')
        .eq('family_id', FAMILY_ID)
        .eq('activity_type', 'tummy_time')
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setActivities(data as BabyActivity[]);
    } catch {
      // Fallback mock data jika Supabase offline
      setActivities([
        {
          id: 'tt-1',
          family_id: FAMILY_ID,
          activity_type: 'tummy_time',
          duration_minutes: 5,
          started_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
          created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        },
        {
          id: 'tt-2',
          family_id: FAMILY_ID,
          activity_type: 'tummy_time',
          duration_minutes: 8,
          started_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
          created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
        },
      ]);
    }
  }, []);

  // Realtime subscription untuk Tummy Time
  useEffect(() => {
    fetchTodayTummyTime();

    const channel = supabase
      .channel(`public:baby_activities:${FAMILY_ID}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'baby_activities', filter: `family_id=eq.${FAMILY_ID}` },
        () => fetchTodayTummyTime()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTodayTummyTime]);

  // Stopwatch ticker saat timer berjalan
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const startLiveSession = () => {
    setTimerSeconds(0);
    setIsTimerRunning(true);
    playAlertSound('chime');
  };

  const stopAndSaveSession = async () => {
    setIsTimerRunning(false);
    const durationMins = Math.max(1, Math.round(timerSeconds / 60));

    const newActivity: BabyActivity = {
      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `tt-${Date.now()}`,
      family_id: FAMILY_ID,
      activity_type: 'tummy_time',
      duration_minutes: durationMins,
      started_at: new Date(Date.now() - timerSeconds * 1000).toISOString(),
      finished_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    setActivities((prev) => [newActivity, ...prev]);
    setTimerSeconds(0);
    playAlertSound('finish');

    try {
      await supabase.from('baby_activities').insert([newActivity]);
    } catch (err) {
      console.warn('Save tummy time error:', err);
    }
  };

  const totalMinutesToday = activities.reduce((acc, curr) => acc + curr.duration_minutes, 0);
  const completedSessionsToday = activities.length;

  return {
    activities,
    completedSessionsToday,
    targetSessions,
    totalMinutesToday,
    isTimerRunning,
    timerSeconds,
    startLiveSession,
    stopAndSaveSession,
  };
}
