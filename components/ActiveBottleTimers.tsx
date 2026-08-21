'use client';

import React, { useEffect, useState } from 'react';
import { Clock, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';
import { FeedingLog } from '@/lib/supabase/types';
import { playAlertSound } from '@/lib/audioAlert';

interface ActiveBottleTimersProps {
  activeFeeding?: FeedingLog;
  recentFinishedFeeding?: FeedingLog;
}

export function ActiveBottleTimers({ activeFeeding, recentFinishedFeeding }: ActiveBottleTimersProps) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [now, setNow] = useState<number>(Date.now());
  const [alarmPlayed, setAlarmPlayed] = useState<boolean>(false);

  // Interval ticker per detik
  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return (
      <div className="bg-card border border-card-border rounded-2xl p-5 shadow-lg animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/3 mb-2" />
        <div className="h-8 bg-slate-800 rounded" />
      </div>
    );
  }

  if (!activeFeeding && !recentFinishedFeeding) {
    return (
      <div className="bg-card border border-card-border rounded-2xl p-5 shadow-lg flex items-center gap-3 text-slate-400">
        <Clock className="w-5 h-5 text-slate-500" />
        <p className="text-xs">Tidak ada timer botol aktif. Klik preset di atas untuk membuat susu baru.</p>
      </div>
    );
  }

  // 1. HITUNG EXPIRATION TIMER (BASI SUSU)
  let expMaxMs = 2 * 60 * 60 * 1000;
  let expStartMs = activeFeeding ? new Date(activeFeeding.created_at || Date.now()).getTime() : 0;
  let timerLabel = 'Basi (2 Jam dari Dibuat)';

  if (activeFeeding && activeFeeding.status === 'mulai_minum' && activeFeeding.drinking_started_at) {
    expMaxMs = 1 * 60 * 60 * 1000;
    expStartMs = new Date(activeFeeding.drinking_started_at).getTime();
    timerLabel = 'Basi (1 Jam dari Minum)';
  }

  const expElapsedMs = Math.max(0, now - (isNaN(expStartMs) ? now : expStartMs));
  const expRemainingMs = Math.max(0, expMaxMs - expElapsedMs);
  const expMinutes = Math.floor(expRemainingMs / (1000 * 60));
  const expSeconds = Math.floor((expRemainingMs % (1000 * 60)) / 1000);
  const expPercent = Math.min(100, Math.max(0, (expRemainingMs / expMaxMs) * 100));

  // 2. HITUNG POSISI TEGAK 20 MENIT (ANTI-REFLUKS / SENDAWA TIMER)
  let uprightRemainingMs = 0;
  let uprightPercent = 0;
  let isUprightActive = false;
  const UPRIGHT_DURATION_MS = 20 * 60 * 1000;

  if (recentFinishedFeeding && recentFinishedFeeding.finished_at) {
    const finishedMs = new Date(recentFinishedFeeding.finished_at).getTime();
    const uprightElapsedMs = Math.max(0, now - (isNaN(finishedMs) ? now : finishedMs));
    uprightRemainingMs = Math.max(0, UPRIGHT_DURATION_MS - uprightElapsedMs);
    isUprightActive = uprightRemainingMs > 0;
    uprightPercent = (uprightRemainingMs / UPRIGHT_DURATION_MS) * 100;

    if (uprightRemainingMs === 0 && !alarmPlayed) {
      playAlertSound('finish');
      setAlarmPlayed(true);
    }
  }

  return (
    <div className="bg-card border border-card-border rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">Smart Bottle & Health Timers</h3>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
          Realtime Sync
        </span>
      </div>

      {/* A. TIMER KETAHANAN / BASI SUSU */}
      {activeFeeding && (activeFeeding.status === 'dibuat' || activeFeeding.status === 'mulai_minum') && (
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                {expRemainingMs === 0 ? (
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                Countdown Susu Basi ({activeFeeding.amount_ml} ml)
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{timerLabel}</p>
            </div>
            <div className="text-right">
              <span
                className={`text-2xl font-black font-mono tracking-tight ${
                  expRemainingMs === 0
                    ? 'text-rose-500 animate-pulse'
                    : expMinutes < 15
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {String(expMinutes).padStart(2, '0')}:{String(expSeconds).padStart(2, '0')}
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-3">
            <div
              className={`h-full transition-all duration-1000 ${
                expRemainingMs === 0
                  ? 'bg-rose-500'
                  : expMinutes < 15
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${expPercent}%` }}
            />
          </div>

          {expRemainingMs === 0 && (
            <p className="text-xs text-rose-400 font-bold mt-2 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 text-center">
              ⚠️ Susu sudah melewati batas waktu aman! Segera buang botol ini.
            </p>
          )}
        </div>
      )}

      {/* B. TIMER POSISI TEGAK 20 MENIT (ANTI-REFLUKS / SENDAWA) */}
      {recentFinishedFeeding && (
        <div className="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300">
                👶
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Timer Posisi Tegak (20 Menit)</h4>
                <p className="text-[10px] text-indigo-300">Cegah refluks / gumoh (Sendawa)</p>
              </div>
            </div>

            {isUprightActive ? (
              <span className="text-2xl font-black font-mono text-indigo-400 tracking-tight">
                {String(Math.floor(uprightRemainingMs / (1000 * 60))).padStart(2, '0')}:
                {String(Math.floor((uprightRemainingMs % (1000 * 60)) / 1000)).padStart(2, '0')}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle className="w-3.5 h-3.5" /> Selesai
              </span>
            )}
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-1000"
              style={{ width: `${uprightPercent}%` }}
            />
          </div>

          {isUprightActive ? (
            <p className="text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
              💡 Gendong bayi dalam posisi tegak/dada menempel di bahu selama 20 menit agar udara dalam lambung keluar.
            </p>
          ) : (
            <p className="text-[11px] text-emerald-300 bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-800/40">
              🎉 20 menit posisi tegak telah selesai! Bayi aman direbahkan atau dilanjutkan tidur.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
