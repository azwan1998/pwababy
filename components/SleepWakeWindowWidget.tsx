'use client';

import React, { useState, useEffect } from 'react';
import { Moon, Sun, Clock, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useBabySleep } from '@/hooks/useBabySleep';
import guideData from '@/data/babyPediatricGuide.json';

interface SleepWakeWindowWidgetProps {
  babyAgeMonths?: number;
}

export function SleepWakeWindowWidget({ babyAgeMonths = 2 }: SleepWakeWindowWidgetProps) {
  const {
    isSleeping,
    sleepStartMs,
    lastWakeTimeMs,
    totalSleepMinutesToday,
    startSleep,
    wakeUp,
  } = useBabySleep();

  const [nowMs, setNowMs] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cari panduan Wake Window dari JSON berdasarkan umur
  const matchedGuide = guideData.ageRanges.find(
    (g) => babyAgeMonths >= g.minMonths && babyAgeMonths < g.maxMonths
  ) || guideData.ageRanges[1]; // default 1-3 bulan

  const wakeWindowConfig = matchedGuide.sleep.wakeWindowMinutes;
  const maxWakeMinutes = wakeWindowConfig.max;

  // Hitung durasi
  let currentSleepMins = 0;
  let currentWakeMins = 0;

  if (isSleeping && sleepStartMs) {
    currentSleepMins = Math.floor((nowMs - sleepStartMs) / 60000);
  } else {
    currentWakeMins = Math.floor((nowMs - lastWakeTimeMs) / 60000);
  }

  const wakeHours = Math.floor(currentWakeMins / 60);
  const wakeMinsRem = currentWakeMins % 60;

  const isOvertired = !isSleeping && currentWakeMins >= maxWakeMinutes;
  const isNearNapTime = !isSleeping && currentWakeMins >= maxWakeMinutes - 15;

  return (
    <div className="bg-card border border-card-border rounded-2xl p-5 shadow-xl space-y-4">
      {/* HEADER WIDGET */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2.5 rounded-xl border ${isSleeping ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
            {isSleeping ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Durasi Tidur & Wake Window</h3>
            <p className="text-xs text-slate-400">Pola Tidur Siang & Malam</p>
          </div>
        </div>

        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${isSleeping ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
          {isSleeping ? '🌙 Sedang Tidur' : '☀️ Sedang Bangun'}
        </span>
      </div>

      {/* ACTION TOMBOL TIDUR / BANGUN */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
        {isSleeping ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400">Durasi Tidur Saat Ini:</p>
              <p className="text-2xl font-black font-mono text-indigo-400 mt-0.5">
                {Math.floor(currentSleepMins / 60)}j {currentSleepMins % 60}m
              </p>
            </div>

            <button
              onClick={wakeUp}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg active:scale-95 transition"
            >
              <Sun className="w-4 h-4 fill-current" /> Bangun Tidur
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Sudah Bangun (Wake Window):
              </p>
              <p className={`text-2xl font-black font-mono mt-0.5 ${isOvertired ? 'text-rose-500 animate-pulse' : isNearNapTime ? 'text-amber-400' : 'text-cyan-400'}`}>
                {wakeHours > 0 ? `${wakeHours}j ` : ''}{wakeMinsRem}m
              </p>
            </div>

            <button
              onClick={startSleep}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs rounded-xl shadow-lg active:scale-95 transition"
            >
              <Moon className="w-4 h-4 fill-current" /> Mulai Tidur
            </button>
          </div>
        )}

        {/* GUIDELINE INFO WAKE WINDOW */}
        <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
          <span className="text-slate-400">Batas Wake Window Ideal:</span>
          <span className="font-extrabold text-amber-400">{wakeWindowConfig.label}</span>
        </div>
      </div>

      {/* ALERT WAKE WINDOW & OVERTIRED */}
      {!isSleeping && (
        isOvertired ? (
          <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-rose-300 text-xs">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-bold">⚠️ Perhatian: Waktunya Tidur Siang (Overtired)!</p>
              <p className="text-[11px] text-rose-200/80 mt-0.5">
                Si kecil sudah bangun selama {currentWakeMins} menit (melewati batas {maxWakeMinutes} m). Segera tidurkan agar tidak rewel.
              </p>
            </div>
          </div>
        ) : isNearNapTime ? (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-amber-300 text-xs">
            <Sparkles className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>Persiapkan suasana tidur, wake window akan habis 15 menit lagi.</span>
          </div>
        ) : null
      )}

      {/* RINGKASAN TOTAL TIDUR HARI INI */}
      <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Total Tidur Hari Ini:
        </span>
        <span className="font-bold text-white">
          {Math.floor(totalSleepMinutesToday / 60)} Jam {totalSleepMinutesToday % 60} Menit / target {matchedGuide.sleep.totalSleepHours}
        </span>
      </div>
    </div>
  );
}
