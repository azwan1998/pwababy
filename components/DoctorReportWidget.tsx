'use client';

import React, { useState, useMemo } from 'react';
import {
  Stethoscope,
  ClipboardList,
  Scale,
  Ruler,
  Sparkles,
  Milk,
  Moon,
  Shirt,
  Activity,
  Check,
  Copy,
  MessageSquare,
  Calendar,
  Award,
  Baby,
  Droplet,
} from 'lucide-react';
import { useBabyProfile } from '@/hooks/useBabyProfile';
import { useGrowthLogs } from '@/hooks/useGrowthLogs';
import { useRealtimeFeedings } from '@/hooks/useRealtimeFeedings';
import { useBabySleep } from '@/hooks/useBabySleep';
import { useDiaperTracker } from '@/hooks/useDiaperTracker';
import { useTummyTime } from '@/hooks/useTummyTime';
import { useHealthLogs } from '@/hooks/useHealthLogs';

type TimeRange = 'today' | '7days' | '30days';

export function DoctorReportWidget() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [copied, setCopied] = useState<boolean>(false);

  const { profile } = useBabyProfile();
  const { logs, latestLog, previousLog, kbmEvaluation, whoStatus } = useGrowthLogs();
  const { latestTemperatureLog, latestMedicationLog } = useHealthLogs();
  const { feedings } = useRealtimeFeedings();
  const { totalSleepMinutesToday } = useBabySleep();
  const { pipisCount, pupCount } = useDiaperTracker();
  const { totalMinutesToday: tummyMinsToday, completedSessionsToday: tummySessionsToday } =
    useTummyTime();

  // Hitung Umur Bayi Presisi
  const ageDetail = useMemo(() => {
    if (!profile.birth_date) return { months: 2, days: 0, text: '2 Bulan' };
    const dob = new Date(profile.birth_date);
    const now = new Date();
    if (isNaN(dob.getTime())) return { months: 2, days: 0, text: '2 Bulan' };

    const diffTime = Math.max(0, now.getTime() - dob.getTime());
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    let months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
    if (now.getDate() < dob.getDate()) months--;
    months = Math.max(0, months);

    const remDays = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 30.4375)) / (1000 * 60 * 60 * 24));

    return {
      months,
      days: remDays,
      totalDays,
      text: `${months} Bulan ${remDays} Hari`,
    };
  }, [profile.birth_date]);

  // Statistik Susu berdasarkan TimeRange
  const milkStats = useMemo(() => {
    const validFeedings = feedings.filter((f) => f.status !== 'dibuang');
    const divisor = timeRange === 'today' ? 1 : timeRange === '7days' ? 7 : 30;

    const totalMl = validFeedings.reduce((acc, curr) => acc + curr.amount_ml, 0);
    const totalCount = validFeedings.length;
    const avgDailyMl = Math.round(totalMl / divisor);
    const avgPortionMl = totalCount > 0 ? Math.round(totalMl / totalCount) : 0;
    const avgDailyFeedings = (totalCount / divisor).toFixed(1);

    return {
      totalMl,
      totalCount,
      avgDailyMl,
      avgPortionMl,
      avgDailyFeedings,
    };
  }, [feedings, timeRange]);

  const currentWeight = latestLog?.weight_kg || Number(profile.weight_kg) || 5.2;

  // Format Teks Ringkasan untuk Salin / WhatsApp
  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const clinicalSummaryText = `📋 *LAPORAN KESEHATAN BAYI (KONSULTASI DOKTER)*
📅 Tanggal: ${todayStr}

👶 *IDENTITAS PASIEN*
• Nama: ${profile.baby_name || 'Si Kecil'}
• Usia: ${ageDetail.text}
• Tanggal Lahir: ${profile.birth_date || '2026-06-01'}

⚖️ *PERTUMBUHAN & KMS (WHO)*
• Berat Badan (BB): ${currentWeight} kg
• Panjang Badan (PB): ${latestLog?.height_cm ? `${latestLog.height_cm} cm` : '-'}
• Lingkar Kepala (LK): ${latestLog?.head_circ_cm ? `${latestLog.head_circ_cm} cm` : '-'}
• Status Gizi WHO: ${whoStatus.label}
${
  kbmEvaluation
    ? `• Evaluasi KBM: ${
        kbmEvaluation.isAchieved
          ? `🟢 Naik Sesuai KBM (+${kbmEvaluation.deltaGrams}g)`
          : `🟡 Belum Target KBM (+${kbmEvaluation.deltaGrams}g / Target +${kbmEvaluation.targetKbmGrams}g)`
      }`
    : ''
}

🥛 *POLA ASUPAN SUSU (${timeRange === 'today' ? 'Hari Ini' : 'Rata-rata 7 Hari'})*
• Rata-rata Harian: ~${milkStats.avgDailyMl} ml / hari
• Frekuensi Minum: ~${milkStats.avgDailyFeedings}x per hari
• Rata-rata Takaran Botol: ~${milkStats.avgPortionMl} ml / sesi

🪆 *POLA ELIMINASI & AKTIVITAS HARIAN*
• Popok Basah (Pipis): ${pipisCount}x (Indikator hidrasi)
• Buang Air Besar (Pup): ${pupCount}x
• Total Waktu Tidur: ${Math.floor(totalSleepMinutesToday / 60)}j ${totalSleepMinutesToday % 60}m
• Tummy Time: ${tummySessionsToday} sesi (${tummyMinsToday} menit)
${
  latestTemperatureLog?.temperature_c
    ? `\n🌡️ *KESEHATAN & SUHU*
• Suhu Terkini: ${latestTemperatureLog.temperature_c} °C
${latestMedicationLog ? `• Obat Terakhir: ${latestMedicationLog.medication_name} (${latestMedicationLog.dosage})` : ''}`
    : ''
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(clinicalSummaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(clinicalSummaryText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 1. HEADER KONSULTASI DOKTER */}
      <div className="bg-gradient-to-r from-sky-950/80 via-slate-900 to-indigo-950/80 border border-sky-500/30 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">Rekap Dokter Anak</h2>
              <p className="text-[11px] text-slate-400 font-medium">Data Klinis & Tumbuh Kembang</p>
            </div>
          </div>

          <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                timeRange === 'today'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setTimeRange('7days')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                timeRange === '7days'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              7 Hari
            </button>
          </div>
        </div>

        {/* PROFIL KLINIS PASIEN BAYI */}
        <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">Nama Pasien:</span>
            <span className="font-extrabold text-white text-sm flex items-center gap-1">
              <Baby className="w-3.5 h-3.5 text-indigo-400" /> {profile.baby_name || 'Si Kecil'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">Usia Pasien:</span>
            <span className="font-extrabold text-amber-400 text-sm">{ageDetail.text}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">Tanggal Lahir:</span>
            <span className="font-semibold text-slate-300 text-xs">{profile.birth_date || '2026-06-01'}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">Status Gizi (WHO):</span>
            <span className="font-bold text-emerald-400 text-xs flex items-center gap-1">
              <Check className="w-3 h-3" /> {whoStatus.label}
            </span>
          </div>
        </div>
      </div>

      {/* 2. 3 KARTU ANTROPOMETRI (BB, PB, LK) */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-2xl bg-card border border-card-border flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Scale className="w-3 h-3 text-emerald-400" /> Berat (BB)
          </span>
          <div className="text-xl font-black text-white font-mono my-1">
            {currentWeight} <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
          {previousLog && (
            <span className="text-[10px] text-emerald-400 font-bold">
              +{Math.round((currentWeight - previousLog.weight_kg) * 1000)}g / bln
            </span>
          )}
        </div>

        <div className="p-3 rounded-2xl bg-card border border-card-border flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Ruler className="w-3 h-3 text-cyan-400" /> Panjang (PB)
          </span>
          <div className="text-xl font-black text-white font-mono my-1">
            {latestLog?.height_cm ? `${latestLog.height_cm}` : '--'}{' '}
            <span className="text-xs font-normal text-slate-400">cm</span>
          </div>
          <span className="text-[10px] text-slate-500">Standar WHO</span>
        </div>

        <div className="p-3 rounded-2xl bg-card border border-card-border flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> L. Kepala (LK)
          </span>
          <div className="text-xl font-black text-white font-mono my-1">
            {latestLog?.head_circ_cm ? `${latestLog.head_circ_cm}` : '--'}{' '}
            <span className="text-xs font-normal text-slate-400">cm</span>
          </div>
          <span className="text-[10px] text-slate-500">Normal</span>
        </div>
      </div>

      {/* 3. 4 PILAR INDIKATOR KLINIS HARIAN */}
      <div className="bg-card border border-card-border rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-white flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-indigo-400" /> Ringkasan Rutinitas Klinis ({timeRange === 'today' ? 'Hari Ini' : 'Rata-rata 7 Hari'})
        </h3>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          {/* ASUPAN SUSU */}
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
              <Milk className="w-3.5 h-3.5 text-indigo-400" /> Asupan Susu
            </span>
            <p className="text-lg font-black text-white font-mono">
              ~{milkStats.avgDailyMl} <span className="text-xs font-normal text-slate-400">ml/hari</span>
            </p>
            <p className="text-[10px] text-slate-400">
              {milkStats.avgDailyFeedings}x minum • ~{milkStats.avgPortionMl} ml/botol
            </p>
          </div>

          {/* ELIMINASI POPOK */}
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
              <Shirt className="w-3.5 h-3.5 text-emerald-400" /> Eliminasi & Popok
            </span>
            <p className="text-lg font-black text-white font-mono">
              {pipisCount}x <span className="text-xs font-normal text-slate-400">Pipis</span> • {pupCount}x <span className="text-xs font-normal text-slate-400">Pup</span>
            </p>
            <p className="text-[10px] text-emerald-400 font-semibold">
              🟢 Hidrasi & Ginjal Baik
            </p>
          </div>

          {/* POLA TIDUR */}
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-violet-400" /> Total Tidur
            </span>
            <p className="text-lg font-black text-white font-mono">
              {Math.floor(totalSleepMinutesToday / 60)}j {totalSleepMinutesToday % 60}m
            </p>
            <p className="text-[10px] text-slate-400">
              Wake window ~60-90 menit
            </p>
          </div>

          {/* TUMMY TIME */}
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" /> Tummy Time
            </span>
            <p className="text-lg font-black text-white font-mono">
              {tummyMinsToday} <span className="text-xs font-normal text-slate-400">menit</span>
            </p>
            <p className="text-[10px] text-slate-400">
              {tummySessionsToday} sesi latihan leher
            </p>
          </div>
        </div>
      </div>

      {/* 4. TABEL RIWAYAT PERTUMBUHAN KMS (UNTUK INSPEKSI DOKTER) */}
      <div className="bg-card border border-card-border rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" /> Riwayat Pertumbuhan & Posyandu
          </h3>
          <span className="text-[10px] text-slate-400">{logs.length} Timbangan</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] text-slate-400 font-semibold">
                <th className="py-2 px-1">Tgl / Umur</th>
                <th className="py-2 px-1">Berat</th>
                <th className="py-2 px-1">Panjang</th>
                <th className="py-2 px-1">L. Kepala</th>
                <th className="py-2 px-1">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-xs text-slate-500">
                    Belum ada data timbangan tercatat.
                  </td>
                </tr>
              ) : (
                [...logs].reverse().map((log) => {
                  const dateShort = new Date(log.measured_date).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                  });

                  return (
                    <tr key={log.id} className="text-slate-300">
                      <td className="py-2 px-1 font-semibold text-white">
                        {dateShort} <span className="text-[10px] text-slate-500 font-normal">({log.age_months} bln)</span>
                      </td>
                      <td className="py-2 px-1 font-mono font-bold text-emerald-400">
                        {log.weight_kg} kg
                      </td>
                      <td className="py-2 px-1 font-mono text-cyan-300">
                        {log.height_cm ? `${log.height_cm} cm` : '-'}
                      </td>
                      <td className="py-2 px-1 font-mono text-amber-300">
                        {log.head_circ_cm ? `${log.head_circ_cm} cm` : '-'}
                      </td>
                      <td className="py-2 px-1 text-[10px] text-slate-400 truncate max-w-[90px]">
                        {log.notes || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. TOMBOL SALIN & BAGIKAN KE WHATSAPP */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-2xl border border-slate-700 shadow-md transition active:scale-95"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Teks Tersalin' : 'Salin Laporan'}
        </button>

        <button
          onClick={handleWhatsAppShare}
          className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-950/40 transition active:scale-95"
        >
          <MessageSquare className="w-3.5 h-3.5" /> Kirim ke WhatsApp
        </button>
      </div>
    </div>
  );
}
