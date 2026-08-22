'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, FAMILY_ID } from '@/lib/supabase/client';
import { HealthLog } from '@/lib/supabase/types';

const STORAGE_KEY = 'baby_health_fever_logs';

export function useHealthLogs() {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update timer clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch dari Supabase / LocalStorage fallback (100% data asli dari DB)
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('health_logs')
        .select('*')
        .eq('family_id', FAMILY_ID)
        .order('recorded_at', { ascending: false });

      if (error) {
        console.warn('Fetch health logs warning:', error.message);
        if (typeof window !== 'undefined') {
          const local = localStorage.getItem(STORAGE_KEY);
          if (local) {
            try {
              setLogs(JSON.parse(local));
            } catch {}
          }
        }
      } else if (data) {
        const formatted: HealthLog[] = data.map((item) => ({
          id: item.id,
          family_id: item.family_id,
          log_type: item.log_type,
          temperature_c: item.temperature_c ? Number(item.temperature_c) : null,
          medication_name: item.medication_name,
          dosage: item.dosage,
          notes: item.notes,
          recorded_at: item.recorded_at,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
        setLogs(formatted);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(formatted));
        }
      }
    } catch (err) {
      console.warn('Fetch health logs exception:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Realtime subscription
  useEffect(() => {
    fetchLogs();

    const channelName = `realtime:health_logs:${FAMILY_ID}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'health_logs', filter: `family_id=eq.${FAMILY_ID}` },
        () => fetchLogs()
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLogs]);

  // Tambah Log Suhu Tubuh
  const addTemperatureLog = async (payload: {
    temperature_c: number;
    notes?: string | null;
    recorded_at?: string;
  }) => {
    const recordedAt = payload.recorded_at || new Date().toISOString();
    const newLog: HealthLog = {
      id: `local-${Date.now()}`,
      family_id: FAMILY_ID,
      log_type: 'temperature',
      temperature_c: payload.temperature_c,
      notes: payload.notes || null,
      recorded_at: recordedAt,
      created_at: new Date().toISOString(),
    };

    const updated = [newLog, ...logs];
    setLogs(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    try {
      const { data, error } = await supabase
        .from('health_logs')
        .insert([
          {
            family_id: FAMILY_ID,
            log_type: 'temperature',
            temperature_c: payload.temperature_c,
            notes: payload.notes || null,
            recorded_at: recordedAt,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        setLogs((prev) =>
          prev.map((l) => (l.id === newLog.id ? { ...l, id: data.id } : l))
        );
      }
    } catch (err) {
      console.warn('Insert temp log error:', err);
    }
  };

  // Tambah Log Obat
  const addMedicationLog = async (payload: {
    medication_name: string;
    dosage: string;
    notes?: string | null;
    recorded_at?: string;
  }) => {
    const recordedAt = payload.recorded_at || new Date().toISOString();
    const newLog: HealthLog = {
      id: `local-${Date.now()}`,
      family_id: FAMILY_ID,
      log_type: 'medication',
      medication_name: payload.medication_name,
      dosage: payload.dosage,
      notes: payload.notes || null,
      recorded_at: recordedAt,
      created_at: new Date().toISOString(),
    };

    const updated = [newLog, ...logs];
    setLogs(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    try {
      const { data, error } = await supabase
        .from('health_logs')
        .insert([
          {
            family_id: FAMILY_ID,
            log_type: 'medication',
            medication_name: payload.medication_name,
            dosage: payload.dosage,
            notes: payload.notes || null,
            recorded_at: recordedAt,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        setLogs((prev) =>
          prev.map((l) => (l.id === newLog.id ? { ...l, id: data.id } : l))
        );
      }
    } catch (err) {
      console.warn('Insert med log error:', err);
    }
  };

  // Hapus Log
  const deleteHealthLog = async (id: string) => {
    const updated = logs.filter((l) => l.id !== id);
    setLogs(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    try {
      await supabase.from('health_logs').delete().eq('id', id);
    } catch (err) {
      console.warn('Delete health log error:', err);
    }
  };

  // Log Suhu Terkini
  const latestTemperatureLog = useMemo(() => {
    return logs.find((l) => l.log_type === 'temperature') || null;
  }, [logs]);

  // Log Obat Terkini
  const latestMedicationLog = useMemo(() => {
    return logs.find((l) => l.log_type === 'medication') || null;
  }, [logs]);

  // Evaluasi Status Demam
  const feverStatus = useMemo(() => {
    if (!latestTemperatureLog || !latestTemperatureLog.temperature_c) {
      return { status: 'none', label: 'Belum Ada Data', color: 'slate', badge: 'bg-slate-800 text-slate-400' };
    }
    const t = latestTemperatureLog.temperature_c;

    if (t < 37.6) {
      return {
        status: 'normal',
        label: 'Suhu Normal',
        color: 'emerald',
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      };
    }
    if (t <= 38.0) {
      return {
        status: 'subfebris',
        label: 'Hangat / Subfebris',
        color: 'amber',
        badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      };
    }
    if (t <= 39.0) {
      return {
        status: 'demam',
        label: 'Demam',
        color: 'orange',
        badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      };
    }
    return {
      status: 'tinggi',
      label: 'Demam Tinggi (Waspada)',
      color: 'rose',
      badge: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    };
  }, [latestTemperatureLog]);

  // Evaluasi Countdown Jeda Dosis Obat (Minimal 4 jam sejak obat terakhir)
  const medicationInterval = useMemo(() => {
    if (!latestMedicationLog) return null;

    const medTime = new Date(latestMedicationLog.recorded_at);
    const safeNextTime = new Date(medTime.getTime() + 4 * 60 * 60 * 1000); // +4 jam
    const now = currentTime.getTime();
    const diffMs = safeNextTime.getTime() - now;

    const isSafeNow = diffMs <= 0;
    const remainingMinutes = isSafeNow ? 0 : Math.ceil(diffMs / (1000 * 60));
    const remHours = Math.floor(remainingMinutes / 60);
    const remMins = remainingMinutes % 60;

    const timeStr = safeNextTime.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      lastMedName: latestMedicationLog.medication_name,
      lastDosage: latestMedicationLog.dosage,
      lastGivenTime: medTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      safeNextTimeStr: timeStr,
      isSafeNow,
      remainingMinutes,
      countdownLabel: isSafeNow ? 'Aman Diberikan Sekarang' : `${remHours}j ${remMins}m lagi`,
    };
  }, [latestMedicationLog, currentTime]);

  return {
    logs,
    loading,
    latestTemperatureLog,
    latestMedicationLog,
    feverStatus,
    medicationInterval,
    addTemperatureLog,
    addMedicationLog,
    deleteHealthLog,
    refresh: fetchLogs,
  };
}
