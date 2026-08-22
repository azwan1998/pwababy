'use client';

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Scale,
  Ruler,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  Calendar,
  X,
  Check,
} from 'lucide-react';
import { useGrowthLogs } from '@/hooks/useGrowthLogs';
import { useBabyProfile } from '@/hooks/useBabyProfile';
import whoData from '@/data/whoGrowthStandards.json';

type MetricType = 'weight' | 'height' | 'head';

export function KmsGrowthWidget() {
  const { logs, latestLog, previousLog, kbmEvaluation, whoStatus, addGrowthLog, deleteGrowthLog } =
    useGrowthLogs();
  const { profile } = useBabyProfile();

  const [activeMetric, setActiveMetric] = useState<MetricType>('weight');
  const [showForm, setShowForm] = useState<boolean>(false);

  // Form states
  const [measuredDate, setMeasuredDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [weightInput, setWeightInput] = useState<string>('5.2');
  const [heightInput, setHeightInput] = useState<string>('58');
  const [headCircInput, setHeadCircInput] = useState<string>('39');
  const [notesInput, setNotesInput] = useState<string>('');

  // Hitung umur bayi otomatis berdasarkan tanggal lahir & tanggal timbang
  const calculateAgeMonths = (dateStr: string) => {
    if (!profile.birth_date) return 2;
    const dob = new Date(profile.birth_date);
    const measured = new Date(dateStr);
    if (isNaN(dob.getTime()) || isNaN(measured.getTime())) return 2;

    let diffMonths =
      (measured.getFullYear() - dob.getFullYear()) * 12 +
      (measured.getMonth() - dob.getMonth());
    const dayDiff = measured.getDate() - dob.getDate();
    if (dayDiff < 0) {
      diffMonths -= 1;
    }
    const fractional = Math.max(0, Math.round((diffMonths + Math.max(0, dayDiff) / 30) * 10) / 10);
    return Math.max(0, fractional);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weightInput);
    if (isNaN(w) || w <= 0) return;

    const ageM = calculateAgeMonths(measuredDate);
    const h = heightInput ? parseFloat(heightInput) : null;
    const hc = headCircInput ? parseFloat(headCircInput) : null;

    await addGrowthLog({
      measured_date: measuredDate,
      age_months: ageM,
      weight_kg: w,
      height_cm: h && !isNaN(h) ? h : null,
      head_circ_cm: hc && !isNaN(hc) ? hc : null,
      notes: notesInput.trim() || null,
    });

    setShowForm(false);
    setNotesInput('');
  };

  // Setup data grafik SVG interaktif
  const chartData = useMemo(() => {
    const maxMonths = 12; // Tampilkan kurva 0-12 bulan untuk fokus tahun pertama
    const width = 320;
    const height = 180;
    const padding = { top: 20, right: 15, bottom: 25, left: 30 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Tentukan range Y berdasarkan metrik
    let minY = 2;
    let maxY = 13;

    if (activeMetric === 'height') {
      minY = 45;
      maxY = 85;
    } else if (activeMetric === 'head') {
      minY = 30;
      maxY = 52;
    }

    const getX = (month: number) => padding.left + (month / maxMonths) * chartWidth;
    const getY = (val: number) =>
      padding.top + chartHeight - ((val - minY) / (maxY - minY)) * chartHeight;

    // Standar WHO
    let whoList: any[] = [];
    if (activeMetric === 'weight') {
      whoList = whoData.weightForAge.filter((d) => d.month <= maxMonths);
    } else if (activeMetric === 'height') {
      whoList = whoData.lengthForAge.filter((d) => d.month <= maxMonths);
    } else {
      whoList = whoData.headCircumference.filter((d) => d.month <= maxMonths);
    }

    // Buat SVG Path untuk kurva standar (Median, Top/Bottom bands)
    const medianPoints = whoList.map((d) => `${getX(d.month)},${getY(d.median)}`).join(' ');
    const topPoints = whoList.map((d) => `${getX(d.month)},${getY(d.sdPlus2)}`).join(' ');
    const bottomPoints = whoList.map((d) => `${getX(d.month)},${getY(d.sdMinus2)}`).join(' ');

    // Area pita hijau normal
    const bandAreaPath =
      whoList.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.month)} ${getY(d.sdPlus2)}`).join(' ') +
      ' ' +
      [...whoList]
        .reverse()
        .map((d) => `L ${getX(d.month)} ${getY(d.sdMinus2)}`)
        .join(' ') +
      ' Z';

    // Titik Plot Aktual Bayi
    const babyPoints = logs
      .filter((l) => l.age_months <= maxMonths)
      .map((l) => {
        let val = l.weight_kg;
        if (activeMetric === 'height' && l.height_cm) val = l.height_cm;
        if (activeMetric === 'head' && l.head_circ_cm) val = l.head_circ_cm;

        return {
          id: l.id,
          month: l.age_months,
          value: val,
          x: getX(l.age_months),
          y: getY(val),
          date: l.measured_date,
        };
      });

    const babyPath = babyPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return {
      width,
      height,
      padding,
      minY,
      maxY,
      medianPoints,
      topPoints,
      bottomPoints,
      bandAreaPath,
      babyPoints,
      babyPath,
    };
  }, [logs, activeMetric]);

  return (
    <div className="bg-card border border-card-border rounded-3xl p-5 shadow-xl space-y-4">
      {/* HEADER WIDGET */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight">KMS Digital</h2>
            <p className="text-[11px] text-slate-400 font-medium">Standar WHO & Kemenkes</p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 active:scale-95 transition"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Tutup' : 'Catat'}
        </button>
      </div>

      {/* FORM INPUT PENGUKURAN BARU */}
      {showForm && (
        <form
          onSubmit={handleFormSubmit}
          className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Catat Timbangan Baru
            </h4>
            <span className="text-[10px] text-slate-400">
              Umur ~{calculateAgeMonths(measuredDate)} Bulan
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-3">
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Tanggal Timbang:
              </label>
              <input
                type="date"
                value={measuredDate}
                onChange={(e) => setMeasuredDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Berat (kg) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="5.2"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Panjang (cm)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="58"
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Lingkar Kepala
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="39"
                value={headCircInput}
                onChange={(e) => setHeadCircInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
              />
            </div>

            <div className="col-span-3">
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Catatan (Opsional, misal: Posyandu)
              </label>
              <input
                type="text"
                placeholder="Posyandu Mawar / Imunisasi"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              <Check className="w-3.5 h-3.5" /> Simpan
            </button>
          </div>
        </form>
      )}

      {/* JIKA BELUM ADA DATA PENGUKURAN */}
      {!latestLog && !showForm && (
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 text-center space-y-1.5">
          <Scale className="w-7 h-7 text-slate-500 mx-auto" />
          <p className="text-xs text-slate-300 font-semibold">Belum Ada Data Timbangan</p>
          <p className="text-[11px] text-slate-500">
            Klik tombol <strong>Catat</strong> di atas untuk mencatat berat badan, panjang, & lingkar kepala si kecil.
          </p>
        </div>
      )}

      {/* 3 KARTU RINGKASAN METRIK TERAKHIR */}
      {latestLog && (
        <div className="grid grid-cols-3 gap-2.5">
          {/* BERAT BADAN */}
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Scale className="w-3 h-3 text-emerald-400" /> Berat
              </span>
            </div>
            <div className="text-xl font-black text-white font-mono tracking-tight">
              {latestLog.weight_kg} <span className="text-xs font-semibold text-slate-400">kg</span>
            </div>
            {previousLog && (
              <span
                className={`text-[10px] font-bold mt-1 ${
                  latestLog.weight_kg >= previousLog.weight_kg
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {latestLog.weight_kg >= previousLog.weight_kg ? '+' : ''}
                {Math.round((latestLog.weight_kg - previousLog.weight_kg) * 1000)}g
              </span>
            )}
          </div>

          {/* PANJANG BADAN */}
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Ruler className="w-3 h-3 text-cyan-400" /> Panjang
              </span>
            </div>
            <div className="text-xl font-black text-white font-mono tracking-tight">
              {latestLog.height_cm ? `${latestLog.height_cm}` : '--'}{' '}
              <span className="text-xs font-semibold text-slate-400">cm</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1">Usia {latestLog.age_months} bln</span>
          </div>

          {/* LINGKAR KEPALA */}
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> L. Kepala
              </span>
            </div>
            <div className="text-xl font-black text-white font-mono tracking-tight">
              {latestLog.head_circ_cm ? `${latestLog.head_circ_cm}` : '--'}{' '}
              <span className="text-xs font-semibold text-slate-400">cm</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1">
              {new Date(latestLog.measured_date).toLocaleDateString('id-ID', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      )}

      {/* EVALUASI KBM & STATUS GIZI WHO */}
      {kbmEvaluation && (
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400" /> KBM Kemenkes Bulan #{kbmEvaluation.currentMonth}:
            </span>
            <span
              className={`font-black text-[11px] px-2 py-0.5 rounded-lg border ${
                kbmEvaluation.isAchieved
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              {kbmEvaluation.isAchieved ? '🟢 Naik Sesuai KBM' : '🟡 Perhatian (Belum Target)'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            <span>
              Target Minimum: <strong className="text-white">+{kbmEvaluation.targetKbmGrams}g</strong>
            </span>
            {kbmEvaluation.hasPrevious && (
              <span>
                Kenaikan: <strong className="text-emerald-400 font-bold">+{kbmEvaluation.deltaGrams}g</strong>
              </span>
            )}
            <span>
              Status WHO: <strong className="text-emerald-400">{whoStatus.label}</strong>
            </span>
          </div>
        </div>
      )}

      {/* KURVA GRAFIK INTERAKTIF SVG (KMS WHO) */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
        {/* TAB PEMILIHAN METRIK GRAFIK */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Kurva Pertumbuhan:
          </span>

          <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveMetric('weight')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                activeMetric === 'weight'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Berat (BB)
            </button>
            <button
              onClick={() => setActiveMetric('height')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                activeMetric === 'height'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Panjang (PB)
            </button>
            <button
              onClick={() => setActiveMetric('head')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                activeMetric === 'head'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              L. Kepala (LK)
            </button>
          </div>
        </div>

        {/* CANVAS SVG CHART */}
        <div className="relative w-full overflow-hidden bg-slate-950/60 rounded-xl p-2 border border-slate-800/80">
          <svg
            viewBox={`0 0 ${chartData.width} ${chartData.height}`}
            className="w-full h-auto overflow-visible"
          >
            {/* Grid Horizontal */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = chartData.padding.top + i * (135 / 4);
              const val = (
                chartData.maxY -
                i * ((chartData.maxY - chartData.minY) / 4)
              ).toFixed(0);
              return (
                <g key={i}>
                  <line
                    x1={chartData.padding.left}
                    y1={y}
                    x2={chartData.width - chartData.padding.right}
                    y2={y}
                    stroke="#334155"
                    strokeDasharray="2 2"
                    strokeWidth="0.75"
                  />
                  <text
                    x={chartData.padding.left - 4}
                    y={y + 3}
                    fill="#64748b"
                    fontSize="7"
                    textAnchor="end"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Grid Vertical (Bulan 0 - 12) */}
            {[0, 2, 4, 6, 8, 10, 12].map((m) => {
              const x = chartData.padding.left + (m / 12) * (chartData.width - 45);
              return (
                <g key={m}>
                  <line
                    x1={x}
                    y1={chartData.padding.top}
                    x2={x}
                    y2={chartData.height - chartData.padding.bottom}
                    stroke="#1e293b"
                    strokeWidth="0.75"
                  />
                  <text
                    x={x}
                    y={chartData.height - chartData.padding.bottom + 12}
                    fill="#64748b"
                    fontSize="7"
                    textAnchor="middle"
                  >
                    {m}bln
                  </text>
                </g>
              );
            })}

            {/* Area Pita Hijau Normal WHO (SD-2 s/d SD+2) */}
            <path d={chartData.bandAreaPath} fill="#10b981" fillOpacity="0.12" />

            {/* Garis Batas Atas (+2SD) */}
            <polyline
              points={chartData.topPoints}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1"
              strokeDasharray="3 2"
            />

            {/* Garis Median Ideal WHO */}
            <polyline
              points={chartData.medianPoints}
              fill="none"
              stroke="#10b981"
              strokeWidth="1.5"
            />

            {/* Garis Batas Bawah (-2SD) */}
            <polyline
              points={chartData.bottomPoints}
              fill="none"
              stroke="#ef4444"
              strokeWidth="1"
              strokeDasharray="3 2"
            />

            {/* Garis Plot Si Kecil */}
            {chartData.babyPoints.length > 1 && (
              <path
                d={chartData.babyPath}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Titik Plot Data Pengukuran Si Kecil */}
            {chartData.babyPoints.map((p, i) => (
              <g key={p.id || i}>
                <circle cx={p.x} cy={p.y} r="4" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                <text
                  x={p.x}
                  y={p.y - 7}
                  fill="#e0f2fe"
                  fontSize="7.5"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {p.value}
                </text>
              </g>
            ))}
          </svg>

          {/* Legenda Keterangan Kurva */}
          <div className="flex items-center justify-center gap-3 pt-2 text-[9px] text-slate-400 font-semibold border-t border-slate-800/80">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-400" /> Si Kecil
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Median WHO
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-1.5 rounded-sm bg-emerald-500/20 border border-emerald-500/40" /> Zona Normal
            </span>
          </div>
        </div>
      </div>

      {/* RIWAYAT PENGUKURAN */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300 font-bold px-1">
          <span>Riwayat Timbangan</span>
          <span className="text-[10px] text-slate-400 font-normal">{logs.length} Data</span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-3">Belum ada catatan pengukuran.</p>
          ) : (
            [...logs].reverse().map((log) => {
              const formattedDate = new Date(log.measured_date).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white">{log.weight_kg} kg</span>
                      {log.height_cm && (
                        <span className="text-cyan-400 text-[11px]">{log.height_cm} cm</span>
                      )}
                      {log.head_circ_cm && (
                        <span className="text-amber-400 text-[11px]">LK {log.head_circ_cm} cm</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Usia {log.age_months} bln • {formattedDate} {log.notes && `• ${log.notes}`}
                    </p>
                  </div>

                  <button
                    onClick={() => deleteGrowthLog(log.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Hapus Catatan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
