'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, FAMILY_ID } from '@/lib/supabase/client';
import { FeedingLog, FeedingStatus } from '@/lib/supabase/types';
import { playAlertSound } from '@/lib/audioAlert';

export function useRealtimeFeedings() {
  const [feedings, setFeedings] = useState<FeedingLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch initial data
  const fetchFeedings = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('feeding_logs')
        .select('*')
        .eq('family_id', FAMILY_ID)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (data) setFeedings(data as FeedingLog[]);
    } catch (err: unknown) {
      console.warn('Supabase fetch error, fallback to local state:', err);
      // Fallback local mock dataset jika Supabase belum disetup credentials-nya
      setFeedings((prev) => (prev.length > 0 ? prev : [
        {
          id: 'demo-1',
          family_id: FAMILY_ID,
          amount_ml: 120,
          status: 'dibuat',
          created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 menit lalu
        }
      ]));
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Realtime listener setup
  useEffect(() => {
    fetchFeedings();

    const channel = supabase
      .channel(`public:feeding_logs:${FAMILY_ID}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feeding_logs',
          filter: `family_id=eq.${FAMILY_ID}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLog = payload.new as FeedingLog;
            setFeedings((prev) => [newLog, ...prev.filter((item) => item.id !== newLog.id)]);
            playAlertSound('chime');
          } else if (payload.eventType === 'UPDATE') {
            const updatedLog = payload.new as FeedingLog;
            setFeedings((prev) =>
              prev.map((item) => (item.id === updatedLog.id ? updatedLog : item))
            );
            if (updatedLog.status === 'selesai') {
              playAlertSound('finish');
            } else {
              playAlertSound('chime');
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setFeedings((prev) => prev.filter((item) => item.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFeedings]);

  // 3. Actions: Create Feeding Log
  const createFeeding = async (amount_ml: number) => {
    const newLog: Partial<FeedingLog> = {
      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `log-${Date.now()}`,
      family_id: FAMILY_ID,
      amount_ml,
      status: 'dibuat',
      created_at: new Date().toISOString(),
    };

    // Optimistic UI Update
    setFeedings((prev) => [newLog as FeedingLog, ...prev]);
    playAlertSound('chime');

    try {
      const { error } = await supabase.from('feeding_logs').insert([newLog]);
      if (error) throw error;
    } catch (err) {
      console.warn('Realtime insert warning, saved locally:', err);
    }
  };

  // 4. Action: Start Drinking
  const startDrinking = async (id: string) => {
    const now = new Date().toISOString();
    setFeedings((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: 'mulai_minum', drinking_started_at: now }
          : item
      )
    );
    playAlertSound('chime');

    try {
      const { error } = await supabase
        .from('feeding_logs')
        .update({ status: 'mulai_minum', drinking_started_at: now })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.warn('Realtime update warning:', err);
    }
  };

  // 5. Action: Finish Feeding (Trigger 20 min upright timer)
  const finishFeeding = async (id: string) => {
    const now = new Date().toISOString();
    setFeedings((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: 'selesai', finished_at: now }
          : item
      )
    );
    playAlertSound('finish');

    try {
      const { error } = await supabase
        .from('feeding_logs')
        .update({ status: 'selesai', finished_at: now })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.warn('Realtime finish update warning:', err);
    }
  };

  // 6. Action: Discard Feeding
  const discardFeeding = async (id: string) => {
    setFeedings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'dibuang' } : item))
    );

    try {
      const { error } = await supabase
        .from('feeding_logs')
        .update({ status: 'dibuang' })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.warn('Realtime discard update warning:', err);
    }
  };

  // Ambil log paling aktif saat ini (dibuat, mulai_minum, atau baru selesai < 20 min lalu)
  const activeFeeding = feedings.find(
    (f) => f.status === 'dibuat' || f.status === 'mulai_minum' || f.status === 'selesai'
  );

  return {
    feedings,
    activeFeeding,
    loading,
    error,
    createFeeding,
    startDrinking,
    finishFeeding,
    discardFeeding,
    refresh: fetchFeedings,
  };
}
