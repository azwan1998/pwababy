'use client';

import React from 'react';
import { Baby, Play, Square, Award, CheckCircle2 } from 'lucide-react';
import { useTummyTime } from '@/hooks/useTummyTime';

export function TummyTimeWidget() {
  const {
    completedSessionsToday,
    targetSessions,
    totalMinutesToday,
    isTimerRunning,
    timerSeconds,
    startLiveSession,
    stopAndSaveSession,
  } = useTummyTime();

  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;

  const isTargetAchieved = completedSessionsToday >= targetSessions;

  return (
    <div className="bg-card border border-card-border rounded-2xl p-5 shadow-xl space-y-4">
      {/* HEADER WIDGET */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Baby className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Tummy Time Tracker</h3>
            <p className="text-xs text-slate-400">Target Harian: 3–5 Sesi</p>
          </div>
        </div>

        {isTargetAchieved ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <Award className="w-3.5 h-3.5" /> Target Tercapai
          </span>
        ) : (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
            {completedSessionsToday} / {targetSessions} Sesi
          </span>
        )}
      </div>

      {/* DYNAMIC TIMER STOPWATCH SECTION */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-slate-400">Durasi Sesi Berjalan</p>
          <p className="text-3xl font-black font-mono text-cyan-400 tracking-tight mt-0.5">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </p>
        </div>

        {isTimerRunning ? (
          <button
            onClick={stopAndSaveSession}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-900/30 active:scale-95 transition-all"
          >
            <Square className="w-4 h-4 fill-current" /> Selesai & Simpan
          </button>
        ) : (
          <button
            onClick={startLiveSession}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-900/30 active:scale-95 transition-all"
          >
            <Play className="w-4 h-4 fill-current" /> Mulai Sesi
          </button>
        )}
      </div>

      {/* STATISTIK HARI INI */}
      <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Total Durasi Hari Ini:</span>
        </div>
        <span className="font-extrabold text-white">{totalMinutesToday} Menit</span>
      </div>
    </div>
  );
}
