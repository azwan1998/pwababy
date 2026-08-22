'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, FAMILY_ID } from '@/lib/supabase/client';
import { GrowthLog } from '@/lib/supabase/types';
import whoData from '@/data/whoGrowthStandards.json';

const STORAGE_KEY = 'baby_growth_logs_data';

export function useGrowthLogs() {
  const [logs, setLogs] = useState<GrowthLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Muat data murni dari Supabase DB (dengan cache fallback)
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('growth_logs')
        .select('*')
        .eq('family_id', FAMILY_ID)
        .order('measured_date', { ascending: true });

      if (error) {
        console.warn('Fetch growth logs warning:', error.message);
        // Fallback localStorage jika offline
        if (typeof window !== 'undefined') {
          const local = localStorage.getItem(STORAGE_KEY);
          if (local) {
            try {
              const parsed = JSON.parse(local);
              // Filter out any previous mock seed items
              const cleaned = Array.isArray(parsed)
                ? parsed.filter((item: GrowthLog) => !item.id?.startsWith('growth-seed'))
                : [];
              setLogs(cleaned);
            } catch {}
          }
        }
      } else if (data) {
        const formatted: GrowthLog[] = data.map((item) => ({
          id: item.id,
          family_id: item.family_id,
          measured_date: item.measured_date,
          age_months: Number(item.age_months) || 0,
          weight_kg: Number(item.weight_kg),
          height_cm: item.height_cm ? Number(item.height_cm) : null,
          head_circ_cm: item.head_circ_cm ? Number(item.head_circ_cm) : null,
          notes: item.notes,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
        setLogs(formatted);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(formatted));
        }
      }
    } catch (err) {
      console.warn('Fetch growth logs error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Supabase Realtime Listener
  useEffect(() => {
    fetchLogs();

    const channelName = `realtime:growth_logs:${FAMILY_ID}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'growth_logs', filter: `family_id=eq.${FAMILY_ID}` },
        () => fetchLogs()
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLogs]);

  // Tambah catatan timbangan baru
  const addGrowthLog = async (payload: {
    measured_date: string;
    age_months: number;
    weight_kg: number;
    height_cm?: number | null;
    head_circ_cm?: number | null;
    notes?: string | null;
  }) => {
    const newLog: GrowthLog = {
      id: `local-${Date.now()}`,
      family_id: FAMILY_ID,
      measured_date: payload.measured_date,
      age_months: payload.age_months,
      weight_kg: payload.weight_kg,
      height_cm: payload.height_cm || null,
      head_circ_cm: payload.head_circ_cm || null,
      notes: payload.notes || null,
      created_at: new Date().toISOString(),
    };

    const updated = [...logs, newLog].sort(
      (a, b) => new Date(a.measured_date).getTime() - new Date(b.measured_date).getTime()
    );
    setLogs(updated);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    // Update baby_profiles weight_kg otomatis ke timbangan terkini
    try {
      await supabase
        .from('baby_profiles')
        .update({ weight_kg: payload.weight_kg, updated_at: new Date().toISOString() })
        .eq('family_id', FAMILY_ID);
    } catch {}

    // Simpan ke Supabase
    try {
      const { data, error } = await supabase
        .from('growth_logs')
        .insert([
          {
            family_id: FAMILY_ID,
            measured_date: payload.measured_date,
            age_months: payload.age_months,
            weight_kg: payload.weight_kg,
            height_cm: payload.height_cm || null,
            head_circ_cm: payload.head_circ_cm || null,
            notes: payload.notes || null,
          },
        ])
        .select()
        .single();

      if (error) {
        console.warn('Insert growth log to DB error:', error.message);
      } else if (data) {
        // Ganti ID lokal dengan ID DB asli
        setLogs((prev) =>
          prev.map((l) => (l.id === newLog.id ? { ...l, id: data.id } : l))
        );
      }
    } catch (err) {
      console.warn('Add growth log exception:', err);
    }
  };

  // Hapus catatan timbangan
  const deleteGrowthLog = async (id: string) => {
    const updated = logs.filter((l) => l.id !== id);
    setLogs(updated);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    try {
      await supabase.from('growth_logs').delete().eq('id', id);
    } catch (err) {
      console.warn('Delete growth log error:', err);
    }
  };

  // Log terkini & log sebelumnya
  const latestLog = useMemo(() => {
    if (logs.length === 0) return null;
    return logs[logs.length - 1];
  }, [logs]);

  const previousLog = useMemo(() => {
    if (logs.length < 2) return null;
    return logs[logs.length - 2];
  }, [logs]);

  // Evaluasi KBM (Kenaikan Berat Minimum Kemenkes RI)
  const kbmEvaluation = useMemo(() => {
    if (!latestLog) return null;

    const currentMonth = Math.round(latestLog.age_months);
    const kbmGramsConfig = whoData.kbmGramsPerMonth as Record<string, number>;
    const targetKbmGrams = kbmGramsConfig[String(currentMonth)] || kbmGramsConfig.defaultOlder || 300;

    let deltaGrams = 0;
    let isAchieved = false;
    let hasPrevious = false;

    if (previousLog) {
      hasPrevious = true;
      deltaGrams = Math.round((latestLog.weight_kg - previousLog.weight_kg) * 1000);
      isAchieved = deltaGrams >= targetKbmGrams;
    }

    return {
      currentMonth,
      targetKbmGrams,
      deltaGrams,
      isAchieved,
      hasPrevious,
    };
  }, [latestLog, previousLog]);

  // Evaluasi Status Gizi Standar WHO (Weight for age)
  const whoStatus = useMemo(() => {
    if (!latestLog) return { status: 'normal', label: 'Gizi Baik', color: 'emerald' };

    const monthKey = Math.min(24, Math.round(latestLog.age_months));
    const standard =
      whoData.weightForAge.find((s) => s.month === monthKey) ||
      whoData.weightForAge[whoData.weightForAge.length - 1];

    const weight = latestLog.weight_kg;

    if (weight < standard.sdMinus3) {
      return { status: 'severely_underweight', label: 'Gizi Sangat Kurang', color: 'rose' };
    }
    if (weight < standard.sdMinus2) {
      return { status: 'underweight', label: 'Gizi Kurang (Risiko)', color: 'amber' };
    }
    if (weight > standard.sdPlus2) {
      return { status: 'overweight', label: 'Risiko Gizi Lebih', color: 'amber' };
    }
    return { status: 'normal', label: 'Gizi Baik (Normal)', color: 'emerald' };
  }, [latestLog]);

  return {
    logs,
    loading,
    latestLog,
    previousLog,
    kbmEvaluation,
    whoStatus,
    addGrowthLog,
    deleteGrowthLog,
    refresh: fetchLogs,
  };
}
