'use client';

import React, { useState } from 'react';
import { Milk, Play, CheckCircle2, Trash2, Plus, Sparkles } from 'lucide-react';
import { FeedingLog } from '@/lib/supabase/types';

interface QuickFeedingActionsProps {
  activeFeeding?: FeedingLog;
  babyAgeMonths?: number;
  onCreateFeeding: (amount_ml: number) => void;
  onStartDrinking: (id: string) => void;
  onFinishFeeding: (id: string) => void;
  onDiscardFeeding: (id: string) => void;
}

export function QuickFeedingActions({
  activeFeeding,
  babyAgeMonths = 2,
  onCreateFeeding,
  onStartDrinking,
  onFinishFeeding,
  onDiscardFeeding,
}: QuickFeedingActionsProps) {
  const [customMl, setCustomMl] = useState<string>('');
  const [showCustom, setShowCustom] = useState<boolean>(false);

  // Preset ml ukuran botol sesuai takaran Bebelac
  const bebelacPresets = [
    { ml: 65, scoops: 2, label: '65 ml' },
    { ml: 100, scoops: 3, label: '100 ml' },
    { ml: 135, scoops: 4, label: '135 ml' },
    { ml: 165, scoops: 5, label: '165 ml' },
    { ml: 200, scoops: 6, label: '200 ml' },
    { ml: 235, scoops: 7, label: '235 ml' },
  ];

  // Tentukan preset yang direkomendasikan berdasarkan umur
  const getRecommendedPresetMl = (months: number) => {
    if (months < 1) return 65;
    if (months >= 1 && months < 3) return 135;
    if (months >= 3 && months < 6) return 165;
    return 200;
  };

  const recommendedMl = getRecommendedPresetMl(babyAgeMonths);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customMl, 10);
    if (val > 0) {
      onCreateFeeding(val);
      setCustomMl('');
      setShowCustom(false);
    }
  };

  return (
    <div className="bg-card border border-card-border rounded-2xl p-5 shadow-xl transition-all space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Milk className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">Pemberian Susu</h2>
            <p className="text-xs text-slate-400">Takaran Standar Bebelac</p>
          </div>
        </div>

        {activeFeeding && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
            Botol Aktif ({activeFeeding.amount_ml} ml)
          </span>
        )}
      </div>

      {/* JIKA ADA BOTOL SUSU YANG SEDANG AKTIF */}
      {activeFeeding && (activeFeeding.status === 'dibuat' || activeFeeding.status === 'mulai_minum') ? (
        <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-sm text-slate-300">
            <span>Status Saat Ini:</span>
            <span className="font-bold text-indigo-400 capitalize">
              {activeFeeding.status === 'dibuat' ? '🍼 Dibuat (Menunggu Minum)' : '👶 Sedang Minum'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {activeFeeding.status === 'dibuat' && (
              <button
                onClick={() => onStartDrinking(activeFeeding.id)}
                className="col-span-2 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 active:scale-95 transition-all text-base min-h-[52px]"
              >
                <Play className="w-5 h-5 fill-current" />
                Mulai Minum (Sentuh Bibir)
              </button>
            )}

            {activeFeeding.status === 'mulai_minum' && (
              <button
                onClick={() => onFinishFeeding(activeFeeding.id)}
                className="col-span-2 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/30 active:scale-95 transition-all text-base min-h-[52px]"
              >
                <CheckCircle2 className="w-5 h-5" />
                Selesai / Habis (Mulai Posisi Tegak)
              </button>
            )}

            <button
              onClick={() => onDiscardFeeding(activeFeeding.id)}
              className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
              Buang Susu Basi / Tidak Dihabiskan
            </button>
          </div>
        </div>
      ) : (
        /* PRESET TOMBOL UKURAN BEBELAC: 65, 100, 135, 165, 200, 235 ml */
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-300 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Pilih Ukuran Botol:
            </p>
            <span className="text-[10px] text-slate-400">Potong Stok Otomatis</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 mb-3">
            {bebelacPresets.map((item) => {
              const isRecommended = item.ml === recommendedMl;
              return (
                <button
                  key={item.ml}
                  onClick={() => onCreateFeeding(item.ml)}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-xl transition-all active:scale-95 border min-h-[70px] ${
                    isRecommended
                      ? 'bg-gradient-to-b from-indigo-900/90 to-slate-900 border-indigo-500 shadow-lg shadow-indigo-950/50'
                      : 'bg-slate-900/80 hover:bg-indigo-950/40 border-slate-800 hover:border-indigo-500/50'
                  }`}
                >
                  {isRecommended && (
                    <span className="absolute -top-2 bg-amber-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full shadow">
                      Ideal
                    </span>
                  )}
                  <span className="text-xl font-black text-white">{item.label}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {item.scoops} Scoop (~{(item.scoops * 4.6).toFixed(1)}g)
                  </span>
                </button>
              );
            })}
          </div>

          {/* CUSTOM ML INPUT */}
          {showCustom ? (
            <form onSubmit={handleCustomSubmit} className="flex gap-2 mt-2">
              <input
                type="number"
                placeholder="Jumlah ml (misal: 150)"
                value={customMl}
                onChange={(e) => setCustomMl(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition"
              >
                Buat
              </button>
              <button
                type="button"
                onClick={() => setShowCustom(false)}
                className="bg-slate-800 text-slate-400 px-3 py-2.5 rounded-xl text-sm"
              >
                Batal
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowCustom(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-700 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-300 text-xs font-semibold rounded-xl transition"
            >
              <Plus className="w-3.5 h-3.5" /> Ukuran Kustom Lainnya
            </button>
          )}
        </div>
      )}
    </div>
  );
}
