'use client';

import React, { useEffect, useState } from 'react';
import {
  Clock,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Milk,
  Timer,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { FeedingLog } from '@/lib/supabase/types';
import { playAlertSound } from '@/lib/audioAlert';
import guideData from '@/data/babyPediatricGuide.json';

interface ActiveBottleTimersProps {
  activeFeeding?: FeedingLog;
  recentFinishedFeeding?: FeedingLog;
  lastFinishedFeeding?: FeedingLog;
  babyAgeMonths?: number;
  onCreateFeeding?: (amount_ml: number) => void;
}

export function ActiveBottleTimers({
  activeFeeding,
  recentFinishedFeeding,
  lastFinishedFeeding,
  babyAgeMonths = 2,
  onCreateFeeding,
}: ActiveBottleTimersProps) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [now, setNow] = useState<number>(Date.now());
  const [uprightAlarmPlayed, setUprightAlarmPlayed] = useState<boolean>(false);
  const [nextFeedAlarmPlayedId, setNextFeedAlarmPlayedId] = useState<string | null>(null);

  // Cari panduan pediatrik berdasarkan umur
  const defaultGuide = guideData.ageRanges[1] || guideData.ageRanges[0];
  const matchedGuide =
    guideData.ageRanges.find((g) => babyAgeMonths >= g.minMonths && babyAgeMonths < g.maxMonths) || defaultGuide;
  const recommendedIntervalHours = matchedGuide?.milk?.intervalHours || 3.0;

  // Interval jeda susu pilihan user (disimpan di localStorage atau default dari umur)
  const [intervalHours, setIntervalHours] = useState<number>(recommendedIntervalHours);

  // Muat preferensi interval dari localStorage
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('baby_feeding_interval_hours');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed > 0) {
          setIntervalHours(parsed);
          return;
        }
      }
      setIntervalHours(recommendedIntervalHours);
    }
  }, [recommendedIntervalHours]);

  // Interval ticker per detik
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectInterval = (hours: number) => {
    setIntervalHours(hours);
    if (typeof window !== 'undefined') {
      localStorage.setItem('baby_feeding_interval_hours', String(hours));
    }
  };

  if (!mounted) {
    return (
      <div className="bg-card border border-card-border rounded-2xl p-5 shadow-lg animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/3 mb-2" />
        <div className="h-8 bg-slate-800 rounded" />
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

    if (uprightRemainingMs === 0 && !uprightAlarmPlayed) {
      playAlertSound('finish');
      setUprightAlarmPlayed(true);
    }
  }

  // 3. HITUNG COUNTDOWN JADWAL MINUM SUSU BERIKUTNYA
  let finishedTimeMs = 0;
  let lastFinishedAmount = 0;
  let hasFinishedLog = false;

  if (lastFinishedFeeding) {
    const rawTime = lastFinishedFeeding.finished_at || lastFinishedFeeding.created_at;
    const parsed = new Date(rawTime).getTime();
    if (!isNaN(parsed)) {
      finishedTimeMs = parsed;
      lastFinishedAmount = lastFinishedFeeding.amount_ml;
      hasFinishedLog = true;
    }
  }

  const intervalDurationMs = intervalHours * 60 * 60 * 1000;
  const targetNextFeedingMs = finishedTimeMs ? finishedTimeMs + intervalDurationMs : 0;
  const nextFeedRemainingMs = targetNextFeedingMs ? targetNextFeedingMs - now : 0;
  const isNextFeedOverdue = hasFinishedLog && nextFeedRemainingMs <= 0;

  const nextFeedElapsedMs = hasFinishedLog ? Math.max(0, now - finishedTimeMs) : 0;
  const nextFeedProgressPercent = Math.min(100, Math.max(0, (nextFeedElapsedMs / intervalDurationMs) * 100));

  const absNextFeedMs = Math.abs(nextFeedRemainingMs);
  const nextFeedHours = Math.floor(absNextFeedMs / (1000 * 60 * 60));
  const nextFeedMins = Math.floor((absNextFeedMs % (1000 * 60 * 60)) / (1000 * 60));
  const nextFeedSecs = Math.floor((absNextFeedMs % (1000 * 60)) / 1000);

  // Status peringatan: Waktunya Minum (<=0m), Persiapan (<=30m), Santai (>30m)
  const isNearNextFeed = hasFinishedLog && !isNextFeedOverdue && nextFeedRemainingMs <= 30 * 60 * 1000;

  // Bunyikan chime notifikasi saat countdown menyentuh 0 (sekali per log ID)
  if (
    hasFinishedLog &&
    isNextFeedOverdue &&
    lastFinishedFeeding &&
    nextFeedAlarmPlayedId !== lastFinishedFeeding.id
  ) {
    playAlertSound('warning');
    setNextFeedAlarmPlayedId(lastFinishedFeeding.id);
  }

  const formatClock = (ms: number) => {
    if (!ms || isNaN(ms)) return '--:--';
    return new Date(ms).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const intervalOptions = [
    { label: '2 Jam', hours: 2.0 },
    { label: '2.5 Jam', hours: 2.5 },
    { label: '3 Jam', hours: 3.0 },
    { label: '3.5 Jam', hours: 3.5 },
    { label: '4 Jam', hours: 4.0 },
  ];

  return (
    <div className="space-y-4">
      {/* ======================================================== */}
      {/* SECTION 1: COUNTDOWN JADWAL MINUM SUSU BERIKUTNYA       */}
      {/* ======================================================== */}
      <section className="bg-card border border-card-border rounded-3xl p-5 shadow-xl space-y-4 relative overflow-hidden">
        {/* Glow Ambient Background */}
        <div
          className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-1000 ${
            isNextFeedOverdue
              ? 'bg-rose-500'
              : isNearNextFeed
              ? 'bg-amber-400'
              : 'bg-indigo-500'
          }`}
        />

        {/* HEADER COUNTDOWN */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2.5 rounded-2xl border transition-all ${
                isNextFeedOverdue
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 ring-2 ring-rose-500/20 animate-pulse'
                  : isNearNextFeed
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              }`}
            >
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white tracking-tight">
                Jadwal Minum Berikutnya
              </h3>
            </div>
          </div>

          <span
            className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
              !hasFinishedLog
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : isNextFeedOverdue
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : isNearNextFeed
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                !hasFinishedLog
                  ? 'bg-slate-500'
                  : isNextFeedOverdue
                  ? 'bg-rose-400 animate-ping'
                  : isNearNextFeed
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
            />
            {!hasFinishedLog
              ? 'Belum Ada Log'
              : isNextFeedOverdue
              ? 'Waktunya Minum!'
              : isNearNextFeed
              ? 'Siapkan Botol'
              : 'Jadwal Aman'}
          </span>
        </div>

        {/* UTAMA: TICKER COUNTDOWN & PROGRESS */}
        {hasFinishedLog ? (
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isNextFeedOverdue
                ? 'bg-gradient-to-br from-rose-950/60 via-slate-900 to-slate-950 border-rose-500/40 shadow-lg shadow-rose-950/40'
                : isNearNextFeed
                ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/30 shadow-lg shadow-amber-950/30'
                : 'bg-slate-900/80 border-slate-800/90'
            }`}
          >
            {/* HIGHLIGHT UTAMA: WAKTU SELESAI & TARGET MINUM BERIKUTNYA */}
            <div className="grid grid-cols-2 gap-2.5 mb-3.5">
              {/* KOTAK SELESAI MINUM */}
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/90 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Selesai
                  </span>
                  {lastFinishedAmount > 0 && (
                    <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                      {lastFinishedAmount} ml
                    </span>
                  )}
                </div>
                <div className="text-xl font-black text-white font-mono tracking-tight">
                  {formatClock(finishedTimeMs)}
                </div>
              </div>

              {/* KOTAK TARGET MINUM BERIKUTNYA */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-md shadow-amber-950/20 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Target
                  </span>
                  <span className="text-[10px] font-bold text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded-md">
                    +{intervalHours} Jam
                  </span>
                </div>
                <div className="text-xl font-black text-amber-300 font-mono tracking-tight">
                  {formatClock(targetNextFeedingMs)}
                </div>
              </div>
            </div>

            {/* SISA WAKTU COUNTDOWN */}
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/60 mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  {isNextFeedOverdue ? 'Waktu Terlewat' : 'Sisa Waktu'}
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span
                    className={`text-2xl font-black font-mono tracking-tight ${
                      isNextFeedOverdue
                        ? 'text-rose-400 animate-pulse'
                        : isNearNextFeed
                        ? 'text-amber-400'
                        : 'text-indigo-300'
                    }`}
                  >
                    {nextFeedHours > 0 && `${String(nextFeedHours).padStart(2, '0')}:`}
                    {String(nextFeedMins).padStart(2, '0')}:{String(nextFeedSecs).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {isNextFeedOverdue ? 'lewat' : 'lagi'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
                    isNextFeedOverdue
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : isNearNextFeed
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  }`}
                >
                  {nextFeedProgressPercent.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* PROGRESS BAR WAKTU MENUJU JADWAL */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    isNextFeedOverdue
                      ? 'bg-rose-500'
                      : isNearNextFeed
                      ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                      : 'bg-gradient-to-r from-indigo-500 via-violet-400 to-emerald-400'
                  }`}
                  style={{ width: `${nextFeedProgressPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold px-0.5">
                <span>0j</span>
                <span>{nextFeedProgressPercent.toFixed(0)}%</span>
                <span>{intervalHours} Jam</span>
              </div>
            </div>

            {/* PESAN & NOTIFIKASI KONDISIONAL */}
            {isNextFeedOverdue ? (
              <div className="mt-3 bg-rose-500/15 border border-rose-500/30 p-3 rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-rose-400 flex-shrink-0 animate-bounce" />
                  <p className="text-xs font-bold text-rose-200">
                    Waktunya Minum Susu!
                  </p>
                </div>
                {onCreateFeeding && (
                  <button
                    onClick={() => onCreateFeeding(matchedGuide?.milk?.suggestedPresetMl || 135)}
                    className="flex-shrink-0 flex items-center gap-1 text-[11px] font-black px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-xl shadow-md active:scale-95 transition"
                  >
                    <Milk className="w-3.5 h-3.5" /> Buat Susu
                  </button>
                )}
              </div>
            ) : isNearNextFeed ? (
              <div className="mt-3 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl flex items-center gap-2 text-xs text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  Sisa {nextFeedMins} menit lagi. Siapkan botol susu.
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 text-center space-y-2">
            <Clock className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-300 font-semibold">
              Belum ada riwayat minum hari ini.
            </p>
          </div>
        )}

        {/* PENGATURAN INTERVAL JEDA MINUM (2h, 2.5h, 3h, 3.5h, 4h) */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Pilih Jeda Waktu:
            </span>
            <span className="text-[10px] text-indigo-300 font-bold">
              Rekomendasi: {recommendedIntervalHours} Jam
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {intervalOptions.map((opt) => {
              const isSelected = intervalHours === opt.hours;
              const isRecommended = opt.hours === recommendedIntervalHours;

              return (
                <button
                  key={opt.hours}
                  onClick={() => handleSelectInterval(opt.hours)}
                  className={`relative py-2 px-1 text-center rounded-xl text-xs font-bold transition-all active:scale-95 border ${
                    isSelected
                      ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white border-indigo-400 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-300'
                      : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {isRecommended && !isSelected && (
                    <span className="absolute -top-1.5 -right-1 w-2 h-2 rounded-full bg-amber-400" />
                  )}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 2: TIMER KETAHANAN / BASI SUSU (JIKA BOTOL AKTIF) */}
      {/* ======================================================== */}
      {activeFeeding && (activeFeeding.status === 'dibuat' || activeFeeding.status === 'mulai_minum') && (
        <section className="bg-card border border-card-border rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Ketahanan Susu ({activeFeeding.amount_ml} ml)</h4>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {activeFeeding.status === 'dibuat' ? 'Susu Baru' : 'Sedang Minum'}
            </span>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  {expRemainingMs === 0 ? (
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  Batas Aman Minum
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
                ⚠️ Batas aman habis! Segera buang susu ini.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* SECTION 3: TIMER POSISI TEGAK 20M (ANTI-REFLUKS)        */}
      {/* ======================================================== */}
      {recentFinishedFeeding && (
        <section className="bg-indigo-950/40 border border-indigo-500/30 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">👶</div>
              <div>
                <h4 className="text-xs font-bold text-white">Posisi Tegak (20 Menit)</h4>
                <p className="text-[10px] text-indigo-300">Cegah gumoh / sendawa</p>
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
            <p className="text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
              💡 Gendong bayi tegak agar udara dalam lambung keluar.
            </p>
          ) : (
            <p className="text-[11px] text-emerald-300 bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-800/40">
              🎉 20 menit selesai! Bayi aman direbahkan.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
