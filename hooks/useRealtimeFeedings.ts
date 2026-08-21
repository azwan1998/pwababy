'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, FAMILY_ID } from '@/lib/supabase/client';
import { FeedingLog } from '@/lib/supabase/types';
import { playAlertSound } from '@/lib/audioAlert';

export function useRealtimeFeedings() {
  const [feedings, setFeedings] = useState<FeedingLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Fetch initial data murni dari Supabase DB
  const fetchFeedings = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('feeding_logs')
        .select('*')
        .eq('family_id', FAMILY_ID)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setFeedings(data ? (data as FeedingLog[]) : []);
    } catch (err) {
      console.warn('Supabase fetch feeding_logs warning:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Listener Supabase Realtime
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
            playAlertSound(updatedLog.status === 'selesai' ? 'finish' : 'chime');
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

  // 3. Actions: Create Feeding Log ke DB Supabase
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
      console.warn('Realtime insert warning:', err);
    }
  };

  // 4. Action: Start Drinking
  const startDrinking = async (id: string) => {
    const now = new Date().toISOString();
    setFeedings((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'mulai_minum', drinking_started_at: now } : item
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

  // 5. Action: Finish Feeding
  const finishFeeding = async (id: string) => {
    const now = new Date().toISOString();
    setFeedings((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'selesai', finished_at: now } : item
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

  const activeFeeding = feedings.find(
    (f) => f.status === 'dibuat' || f.status === 'mulai_minum' || f.status === 'selesai'
  );

  return {
    feedings,
    activeFeeding,
    loading,
    createFeeding,
    startDrinking,
    finishFeeding,
    discardFeeding,
    refresh: fetchFeedings,
  };
}
