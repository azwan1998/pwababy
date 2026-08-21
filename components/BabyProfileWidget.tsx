'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Baby, Heart, Sparkles, Check, Edit2, Scale, Droplet } from 'lucide-react';
import guideData from '@/data/babyPediatricGuide.json';

interface BabyProfileWidgetProps {
  onAgeChange?: (ageInMonths: number) => void;
}

export function BabyProfileWidget({ onAgeChange }: BabyProfileWidgetProps) {
  const [babyName, setBabyName] = useState<string>('Si Kecil');
  const [birthDate, setBirthDate] = useState<string>('2026-06-01'); // Default ~2.5 bulan
  const [weightKg, setWeightKg] = useState<number>(5.2);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Load dari localStorage jika tersedia
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('pwababy_name');
      const savedDob = localStorage.getItem('pwababy_dob');
      const savedWeight = localStorage.getItem('pwababy_weight');
      if (savedName) setBabyName(savedName);
      if (savedDob) setBirthDate(savedDob);
      if (savedWeight) setWeightKg(parseFloat(savedWeight));
    }
  }, []);

  // Hitung Umur Bayi
  const calculateAge = (dobString: string) => {
    const dob = new Date(dobString);
    const now = new Date();

    if (isNaN(dob.getTime())) return { months: 0, weeks: 0, days: 0, text: 'Tanggal lahir belum diset' };

    const diffTime = Math.max(0, now.getTime() - dob.getTime());
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.floor(totalDays / 7);

    let months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
    if (now.getDate() < dob.getDate()) {
      months--;
    }
    months = Math.max(0, months);

    const remDaysAfterMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 30.4375)) / (1000 * 60 * 60 * 24));

    let text = `${months} Bulan ${remDaysAfterMonths} Hari`;
    if (months === 0) {
      text = `${totalWeeks} Minggu (${totalDays} Hari)`;
    }

    return { months, weeks: totalWeeks, days: totalDays, text };
  };

  const age = calculateAge(birthDate);

  useEffect(() => {
    if (onAgeChange) {
      onAgeChange(age.months);
    }
  }, [age.months, onAgeChange]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('pwababy_name', babyName);
      localStorage.setItem('pwababy_dob', birthDate);
      localStorage.setItem('pwababy_weight', weightKg.toString());
    }
    setIsEditing(false);
  };

  // Cari rekomendasi dari data/babyPediatricGuide.json
  const matchedGuide = guideData.ageRanges.find(
    (g) => age.months >= g.minMonths && age.months < g.maxMonths
  ) || guideData.ageRanges[1];

  // Hitung kebutuhan cairan harian berdasarkan Berat Badan Medis: 150 ml x BB (kg)
  const calcDailyFluidMl = Math.round(weightKg * 150);

  return (
    <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
            <Baby className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
              {babyName} <Heart className="w-3.5 h-3.5 text-rose-400 fill-current" />
            </h3>
            <p className="text-xs font-bold text-amber-400">
              Umur: {age.text} • BB: <span className="text-emerald-400">{weightKg} kg</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit Profil
        </button>
      </div>

      {/* FORM EDIT TANGGAL LAHIR & BERAT BADAN */}
      {isEditing ? (
        <form onSubmit={handleSave} className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Nama Bayi</label>
              <input
                type="text"
                value={babyName}
                onChange={(e) => setBabyName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Tanggal Lahir</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-slate-400 block mb-1">Berat Badan Saat Ini (kg)</label>
              <input
                type="number"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(parseFloat(e.target.value) || 3.5)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition"
            >
              <Check className="w-3.5 h-3.5" /> Simpan
            </button>
          </div>
        </form>
      ) : (
        /* REKOMENDASI OTOMATIS BERDASARKAN UMUR & BERAT BADAN (DARI JSON REFERENCE) */
        <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Panduan Medis ({matchedGuide.label})
            </span>
            <span className="text-[10px] text-slate-400">Offline JSON Database</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Droplet className="w-3 h-3 text-emerald-400" /> Kebutuhan Susu Harian:
              </span>
              <span className="font-extrabold text-emerald-400 mt-0.5 block">
                ~{calcDailyFluidMl} ml / hari
              </span>
              <span className="text-[9px] text-slate-500 block">Rumus Medis: 150ml x {weightKg}kg</span>
            </div>

            <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Scale className="w-3 h-3 text-cyan-400" /> Ideal Botol / Minum:
              </span>
              <span className="font-extrabold text-cyan-400 mt-0.5 block">
                {matchedGuide.milk.portionPerFeedingMl}
              </span>
              <span className="text-[9px] text-slate-500 block">{matchedGuide.milk.frequency}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">🌙 Wake Window:</span>
              <span className="font-bold text-amber-300 text-[11px]">{matchedGuide.sleep.wakeWindowMinutes.label}</span>
            </div>

            <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">😴 Total Tidur Harian:</span>
              <span className="font-bold text-indigo-300 text-[11px]">{matchedGuide.sleep.totalSleepHours}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 italic bg-indigo-950/30 p-2 rounded-lg border border-indigo-900/40">
            💡 {matchedGuide.milk.note}
          </p>
        </div>
      )}
    </div>
  );
}
