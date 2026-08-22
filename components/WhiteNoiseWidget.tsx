'use client';

import React from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Clock,
  Sparkles,
  Headphones,
  CheckCircle2,
  Moon,
} from 'lucide-react';
import { useWhiteNoise } from '@/hooks/useWhiteNoise';
import { SOUND_PRESETS, SoundType } from '@/lib/soundSynthesizer';

export function WhiteNoiseWidget() {
  const {
    isPlaying,
    currentSound,
    volume,
    timerMinutes,
    remainingSeconds,
    togglePlay,
    selectSound,
    changeVolume,
    setSleepTimer,
  } = useWhiteNoise();

  const timerOptions = [
    { label: '15m', minutes: 15 },
    { label: '30m', minutes: 30 },
    { label: '45m', minutes: 45 },
    { label: '60m', minutes: 60 },
    { label: 'Non-stop', minutes: null },
  ];

  const activePreset = SOUND_PRESETS.find((p) => p.id === currentSound) || SOUND_PRESETS[0];

  const formatTimer = (secs: number | null) => {
    if (secs === null) return 'Non-stop';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="bg-card border border-card-border rounded-3xl p-5 shadow-xl space-y-4 relative overflow-hidden">
      {/* GLOW BACKGROUND EFFECT */}
      <div
        className={`absolute -top-24 -right-24 w-56 h-56 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-1000 ${
          isPlaying ? 'bg-indigo-500 scale-125' : 'bg-slate-700'
        }`}
      />

      {/* HEADER */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight">White Noise & Shusher</h2>
            <p className="text-[11px] text-slate-400 font-medium">Penenang Tidur Bayi (100% Offline)</p>
          </div>
        </div>

        <span
          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-all ${
            isPlaying
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm animate-pulse'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isPlaying ? 'bg-indigo-400 animate-ping' : 'bg-slate-500'
            }`}
          />
          {isPlaying ? 'Memutar' : 'Jeda'}
        </span>
      </div>

      {/* AMBIENT VISUALIZER & BIG PLAY/PAUSE CONTROL */}
      <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden space-y-3">
        {/* BREATHING AURA ANIMATION KETIKA PLAY */}
        <div className="relative flex items-center justify-center my-2">
          {isPlaying && (
            <>
              <div className="absolute w-32 h-32 rounded-full bg-indigo-500/20 animate-ping duration-1000 pointer-events-none" />
              <div className="absolute w-28 h-28 rounded-full bg-violet-500/30 blur-md animate-pulse pointer-events-none" />
            </>
          )}

          <button
            onClick={togglePlay}
            className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-2xl active:scale-90 transition-all duration-300 border-2 ${
              isPlaying
                ? 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white border-indigo-300 shadow-indigo-950/60 ring-4 ring-indigo-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 shadow-slate-950/60'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </button>
        </div>

        <div className="text-center space-y-0.5">
          <p className="text-sm font-extrabold text-white flex items-center justify-center gap-1.5">
            <span>{activePreset.emoji}</span> {activePreset.name}
          </p>
          <p className="text-[11px] text-slate-400">{activePreset.description}</p>
        </div>

        {/* TIMER COUNTDOWN INFO */}
        {isPlaying && (
          <div className="flex items-center gap-1 text-xs font-mono text-indigo-300 bg-indigo-950/50 px-3 py-1 rounded-xl border border-indigo-800/40 mt-1">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sisa Waktu: {formatTimer(remainingSeconds)}</span>
          </div>
        )}
      </div>

      {/* GRID 7 PILIHAN SUARA */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs px-0.5">
          <span className="text-slate-300 font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Pilih Jenis Suara:
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {SOUND_PRESETS.map((preset) => {
            const isSelected = currentSound === preset.id;

            return (
              <button
                key={preset.id}
                onClick={() => selectSound(preset.id)}
                className={`p-3 rounded-2xl border text-left transition-all active:scale-98 flex items-center justify-between ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-950/80 to-slate-900 border-indigo-500 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-400/40'
                    : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{preset.emoji}</span>
                  <div>
                    <p className="text-xs font-extrabold text-white">{preset.name}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{preset.description}</p>
                  </div>
                </div>

                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* MASTER VOLUME SLIDER */}
      <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
            {volume === 0 ? (
              <VolumeX className="w-4 h-4 text-slate-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-indigo-400" />
            )}
            Volume Suara:
          </span>
          <span className="font-mono font-bold text-white text-xs">{Math.round(volume * 100)}%</span>
        </div>

        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => changeVolume(parseFloat(e.target.value))}
          className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
        />
      </div>

      {/* SLEEP TIMER BUTTONS */}
      <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            Sleep Timer (Mati Otomatis):
          </span>
          <span className="text-[10px] text-indigo-300 font-bold">
            {timerMinutes ? `${timerMinutes} Menit` : 'Non-stop'}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {timerOptions.map((opt) => {
            const isSelected = timerMinutes === opt.minutes;

            return (
              <button
                key={opt.label}
                onClick={() => setSleepTimer(opt.minutes)}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all active:scale-95 border ${
                  isSelected
                    ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white border-indigo-400 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-300'
                    : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
