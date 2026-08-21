'use client';

import React, { useState, useEffect } from 'react';
import { Baby, Heart, Sparkles, Check, Edit2, Scale, Droplet } from 'lucide-react';
import { useBabyProfile } from '@/hooks/useBabyProfile';
import guideData from '@/data/babyPediatricGuide.json';

interface BabyProfileWidgetProps {
  onAgeChange?: (ageInMonths: number) => void;
}

export function BabyProfileWidget({ onAgeChange }: BabyProfileWidgetProps) {
  const { profile, updateProfile } = useBabyProfile();
  const [mounted, setMounted] = useState<boolean>(false);

  const [babyName, setBabyName] = useState<string>('Si Kecil');
  const [birthDate, setBirthDate] = useState<string>('2026-06-01');
  const [weightKg, setWeightKg] = useState<number>(5.2);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (profile) {
      setBabyName(profile.baby_name || 'Si Kecil');
      setBirthDate(profile.birth_date || '2026-06-01');
      setWeightKg(Number(profile.weight_kg) || 5.2);
    }
  }, [profile]);

  // Hitung Umur Bayi dengan Pengecekan Aman
  const calculateAge = (dobString: string) => {
    if (!dobString) return { months: 2, weeks: 8, days: 60, text: '2 Bulan' };

    const dob = new Date(dobString);
    const now = new Date();

    if (isNaN(dob.getTime())) return { months: 2, weeks: 8, days: 60, text: '2 Bulan' };

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
    if (onAgeChange && !isNaN(age.months)) {
      onAgeChange(age.months);
    }
  }, [age.months, onAgeChange]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const safeWeight = Math.max(1, Number(weightKg) || 5.2);
    updateProfile({
      baby_name: babyName || 'Si Kecil',
      birth_date: birthDate || '2026-06-01',
      weight_kg: safeWeight,
    });
    setIsEditing(false);
  };

  // Cari panduan rekomendasi dari data/babyPediatricGuide.json
  const defaultGuide = guideData.ageRanges[1] || guideData.ageRanges[0];
  const matchedGuide =
    guideData.ageRanges.find((g) => age.months >= g.minMonths && age.months < g.maxMonths) || defaultGuide;

  const currentWeight = Number(profile.weight_kg) || 5.2;
  const calcDailyFluidMl = Math.round(currentWeight * 150);

  if (!mounted) {
    return (
      <div className="bg-card border border-card-border rounded-2xl p-5 shadow-lg animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/2 mb-2" />
        <div className="h-10 bg-slate-800 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
            <Baby className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
              {profile.baby_name || 'Si Kecil'} <Heart className="w-3.5 h-3.5 text-rose-400 fill-current" />
            </h3>
            <p className="text-xs font-bold text-amber-400">
              Umur: {age.text} • BB: <span className="text-emerald-400">{currentWeight} kg</span>
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
              <Check className="w-3.5 h-3.5" /> Simpan & Sync
            </button>
          </div>
        </form>
      ) : (
        /* REKOMENDASI OTOMATIS BERDASARKAN UMUR & BERAT BADAN */
        <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Panduan Medis ({matchedGuide?.label || '1 - 3 Bulan'})
            </span>
            <span className="text-[10px] text-slate-400">Realtime Supabase Sync</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Droplet className="w-3 h-3 text-emerald-400" /> Kebutuhan Susu Harian:
              </span>
              <span className="font-extrabold text-emerald-400 mt-0.5 block">
                ~{calcDailyFluidMl} ml / hari
              </span>
              <span className="text-[9px] text-slate-500 block">Rumus Medis: 150ml x {currentWeight}kg</span>
            </div>

            <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Scale className="w-3 h-3 text-cyan-400" /> Ideal Botol / Minum:
              </span>
              <span className="font-extrabold text-cyan-400 mt-0.5 block">
                {matchedGuide?.milk?.portionPerFeedingMl || '100 - 135 ml'}
              </span>
              <span className="text-[9px] text-slate-500 block">{matchedGuide?.milk?.frequency || '5-6x/hari'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">🌙 Wake Window:</span>
              <span className="font-bold text-amber-300 text-[11px]">{matchedGuide?.sleep?.wakeWindowMinutes?.label || '60 - 90 Menit'}</span>
            </div>

            <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">😴 Total Tidur Harian:</span>
              <span className="font-bold text-indigo-300 text-[11px]">{matchedGuide?.sleep?.totalSleepHours || '14 - 16 Jam'}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 italic bg-indigo-950/30 p-2 rounded-lg border border-indigo-900/40">
            💡 {matchedGuide?.milk?.note || 'Takaran susu disesuaikan dengan berat badan dan respons bayi.'}
          </p>
        </div>
      )}
    </div>
  );
}
