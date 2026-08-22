'use client';

import React from 'react';
import { Shirt, Droplets, Sparkles, CheckCircle2, History } from 'lucide-react';
import { useDiaperTracker, DiaperType } from '@/hooks/useDiaperTracker';

export function DiaperTrackerWidget() {
  const { diaperLogs, pipisCount, pupCount, logDiaperChange } = useDiaperTracker();

  return (
    <div className="bg-card border border-card-border rounded-2xl p-5 shadow-xl space-y-4">
      {/* HEADER WIDGET */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Shirt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Ganti Popok</h3>
          </div>
        </div>

        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
          {diaperLogs.length} Kali Hari Ini
        </span>
      </div>

      {/* TOMBOL QUICK ACTION GANTI POPOK */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={() => logDiaperChange('pipis')}
          className="flex flex-col items-center justify-center p-3 bg-slate-900/80 hover:bg-teal-950/50 active:bg-teal-900 border border-slate-800 hover:border-teal-500/50 rounded-xl transition active:scale-95 text-center min-h-[64px]"
        >
          <span className="text-xl mb-0.5">💧</span>
          <span className="text-xs font-extrabold text-teal-300">Pipis</span>
        </button>

        <button
          onClick={() => logDiaperChange('pup')}
          className="flex flex-col items-center justify-center p-3 bg-slate-900/80 hover:bg-amber-950/50 active:bg-amber-900 border border-slate-800 hover:border-amber-500/50 rounded-xl transition active:scale-95 text-center min-h-[64px]"
        >
          <span className="text-xl mb-0.5">💩</span>
          <span className="text-xs font-extrabold text-amber-400">Pup</span>
        </button>

        <button
          onClick={() => logDiaperChange('keduanya')}
          className="flex flex-col items-center justify-center p-3 bg-slate-900/80 hover:bg-indigo-950/50 active:bg-indigo-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl transition active:scale-95 text-center min-h-[64px]"
        >
          <span className="text-xl mb-0.5">💧💩</span>
          <span className="text-xs font-extrabold text-indigo-300">Pipis & Pup</span>
        </button>
      </div>

      {/* COUNTER POPOK HARI INI */}
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5 text-teal-400" /> Pipis:
          </span>
          <span className="font-black text-teal-400 text-sm">{pipisCount}x</span>
        </div>

        <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Pup:
          </span>
          <span className="font-black text-amber-400 text-sm">{pupCount}x</span>
        </div>
      </div>
    </div>
  );
}
