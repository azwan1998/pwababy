'use client';

import React, { useState, useMemo } from 'react';
import {
  Thermometer,
  Pill,
  Clock,
  Plus,
  Trash2,
  Check,
  X,
  AlertTriangle,
  HeartPulse,
  Sparkles,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { useHealthLogs } from '@/hooks/useHealthLogs';
import { useGrowthLogs } from '@/hooks/useGrowthLogs';
import { useBabyProfile } from '@/hooks/useBabyProfile';

export function FeverMedicationWidget() {
  const {
    logs,
    latestTemperatureLog,
    latestMedicationLog,
    feverStatus,
    medicationInterval,
    addTemperatureLog,
    addMedicationLog,
    deleteHealthLog,
  } = useHealthLogs();

  const { latestLog } = useGrowthLogs();
  const { profile } = useBabyProfile();

  const currentWeight = latestLog?.weight_kg || Number(profile.weight_kg) || 5.2;

  // Rekomendasi dosis Paracetamol standar (10-15 mg/kg BB)
  // Drop 100mg/ml -> 0.1 - 0.15 ml per kg BB
  const recommendedDoseDrop = (currentWeight * 0.1).toFixed(1);
  const recommendedDoseSirup = (currentWeight * 0.5).toFixed(1); // Sirup 120mg/5ml

  const [activeModal, setActiveModal] = useState<'temp' | 'med' | null>(null);

  // Form states - Suhu
  const [tempInput, setTempInput] = useState<string>('38.0');
  const [tempNotes, setTempNotes] = useState<string>('');

  // Form states - Obat
  const [medNameInput, setMedNameInput] = useState<string>('Paracetamol Drop');
  const [dosageInput, setDosageInput] = useState<string>(`${recommendedDoseDrop} ml`);
  const [medNotes, setMedNotes] = useState<string>('');

  const handleSaveTemp = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = parseFloat(tempInput);
    if (isNaN(t) || t <= 30 || t >= 45) return;

    await addTemperatureLog({
      temperature_c: t,
      notes: tempNotes.trim() || null,
    });

    setActiveModal(null);
    setTempNotes('');
  };

  const handleSaveMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medNameInput || !dosageInput) return;

    await addMedicationLog({
      medication_name: medNameInput,
      dosage: dosageInput,
      notes: medNotes.trim() || null,
    });

    setActiveModal(null);
    setMedNotes('');
  };

  // Setup data grafik fluktuasi suhu (SVG)
  const chartData = useMemo(() => {
    const tempLogs = logs
      .filter((l) => l.log_type === 'temperature' && l.temperature_c !== null)
      .slice(0, 10)
      .reverse();

    const width = 320;
    const height = 130;
    const padding = { top: 15, right: 15, bottom: 20, left: 30 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const minY = 36.0;
    const maxY = 40.0;

    const getY = (val: number) =>
      padding.top + chartHeight - ((val - minY) / (maxY - minY)) * chartHeight;

    const points = tempLogs.map((l, index) => {
      const x =
        tempLogs.length === 1
          ? padding.left + chartWidth / 2
          : padding.left + (index / (tempLogs.length - 1)) * chartWidth;
      const y = getY(l.temperature_c!);
      const timeStr = new Date(l.recorded_at).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return { id: l.id, val: l.temperature_c!, x, y, time: timeStr };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return { width, height, padding, minY, maxY, points, linePath, tempLogsCount: tempLogs.length, getY };
  }, [logs]);

  return (
    <div className="bg-card border border-card-border rounded-3xl p-5 shadow-xl space-y-4">
      {/* 1. HEADER WIDGET */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-sm">
            <Thermometer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight">Demam & Obat</h2>
            <p className="text-[11px] text-slate-400 font-medium">Log Suhu & Jeda Obat Aman</p>
          </div>
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={() => setActiveModal('temp')}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Suhu
          </button>
          <button
            onClick={() => setActiveModal('med')}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Obat
          </button>
        </div>
      </div>

      {/* 2. DUA KARTU HIGHLIGHT (SUHU TERKINI & JEDA OBAT) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* SUHU TERKINI */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <HeartPulse className="w-3.5 h-3.5 text-orange-400" /> Suhu Terkini
          </span>

          <div>
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              {latestTemperatureLog?.temperature_c ? (
                <>
                  {latestTemperatureLog.temperature_c}{' '}
                  <span className="text-xs font-semibold text-slate-400">°C</span>
                </>
              ) : (
                <span className="text-sm font-semibold text-slate-500">-- °C</span>
              )}
            </div>
            <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${feverStatus.badge}`}>
              {feverStatus.label}
            </span>
          </div>

          <p className="text-[9px] text-slate-500">
            {latestTemperatureLog
              ? `Ukur: ${new Date(latestTemperatureLog.recorded_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
              : 'Belum ada data'}
          </p>
        </div>

        {/* JEDA OBAT AMAN */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Pill className="w-3.5 h-3.5 text-indigo-400" /> Jeda Obat (4 Jam)
          </span>

          <div>
            <div className="text-xs font-bold text-white truncate">
              {medicationInterval ? `${medicationInterval.lastMedName}` : 'Belum Ada Obat'}
            </div>
            <div className="text-[11px] font-mono text-slate-300">
              {medicationInterval ? `Dosis: ${medicationInterval.lastDosage}` : `Dosis Rec: ~${recommendedDoseDrop}ml`}
            </div>

            <span
              className={`inline-block mt-1 text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${
                medicationInterval?.isSafeNow
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : medicationInterval
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {medicationInterval?.countdownLabel || 'Siap Diberikan'}
            </span>
          </div>

          <p className="text-[9px] text-slate-500">
            {medicationInterval ? `Aman: ${medicationInterval.safeNextTimeStr}` : 'Jeda minimal 4 jam'}
          </p>
        </div>
      </div>

      {/* 3. FORM MODAL INPUT SUHU */}
      {activeModal === 'temp' && (
        <form
          onSubmit={handleSaveTemp}
          className="bg-slate-900/95 p-4 rounded-2xl border border-orange-500/30 space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5" /> Catat Suhu Tubuh
            </h4>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">
              Suhu Tubuh (°C):
            </label>
            <input
              type="number"
              step="0.1"
              value={tempInput}
              onChange={(e) => setTempInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-base text-white focus:outline-none focus:border-orange-500 font-mono font-black"
              required
            />

            {/* Quick Buttons Suhu */}
            <div className="flex gap-1.5 mt-2">
              {['37.2', '37.8', '38.2', '38.7', '39.2'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTempInput(preset)}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-lg border transition ${
                    tempInput === preset
                      ? 'bg-orange-600 text-white border-orange-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {preset}°
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">
              Catatan (Opsional, misal: Dahi hangat, pasca imunisasi):
            </label>
            <input
              type="text"
              placeholder="Pasca imunisasi / Kompres air biasa"
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1 px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              <Check className="w-3.5 h-3.5" /> Simpan Suhu
            </button>
          </div>
        </form>
      )}

      {/* 4. FORM MODAL BERI OBAT */}
      {activeModal === 'med' && (
        <form
          onSubmit={handleSaveMed}
          className="bg-slate-900/95 p-4 rounded-2xl border border-indigo-500/30 space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5" /> Catat Pemberian Obat
            </h4>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">
              Pilihan Obat:
            </label>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {[
                { name: 'Paracetamol Drop', dose: `${recommendedDoseDrop} ml` },
                { name: 'Paracetamol Sirup', dose: `${recommendedDoseSirup} ml` },
                { name: 'Ibuprofen Sirup', dose: '2.5 ml' },
                { name: 'Obat Resep Dokter', dose: '1 dosis' },
              ].map((opt) => (
                <button
                  key={opt.name}
                  type="button"
                  onClick={() => {
                    setMedNameInput(opt.name);
                    setDosageInput(opt.dose);
                  }}
                  className={`p-2 rounded-xl text-left border transition text-xs font-bold ${
                    medNameInput === opt.name
                      ? 'bg-indigo-600 text-white border-indigo-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <p className="truncate">{opt.name}</p>
                  <span className="text-[9px] font-normal opacity-80 block">{opt.dose}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                  Nama Obat:
                </label>
                <input
                  type="text"
                  value={medNameInput}
                  onChange={(e) => setMedNameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                  Dosis:
                </label>
                <input
                  type="text"
                  value={dosageInput}
                  onChange={(e) => setDosageInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold font-mono"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">
              Catatan:
            </label>
            <input
              type="text"
              placeholder="Diminum setelah menyusu"
              value={medNotes}
              onChange={(e) => setMedNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              <Check className="w-3.5 h-3.5" /> Simpan Obat
            </button>
          </div>
        </form>
      )}

      {/* 5. GRAFIK TREN SUHU (SVG) */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-orange-400" /> Fluktuasi Suhu (°C):
          </span>
          <span className="text-[10px] text-slate-400">10 Pengukuran Terakhir</span>
        </div>

        {chartData.tempLogsCount === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            Belum ada data suhu tercatat. Klik tombol <strong>+ Suhu</strong> untuk mencatat.
          </div>
        ) : (
          <div className="relative w-full overflow-hidden bg-slate-950/60 rounded-xl p-2 border border-slate-800/80">
            <svg
              viewBox={`0 0 ${chartData.width} ${chartData.height}`}
              className="w-full h-auto overflow-visible"
            >
              {/* Garis Batas Demam 38.0°C */}
              <line
                x1={chartData.padding.left}
                y1={chartData.getY(38.0)}
                x2={chartData.width - chartData.padding.right}
                y2={chartData.getY(38.0)}
                stroke="#f97316"
                strokeDasharray="2 2"
                strokeWidth="0.8"
              />
              <text
                x={chartData.padding.left - 4}
                y={chartData.getY(38.0) + 3}
                fill="#f97316"
                fontSize="6.5"
                textAnchor="end"
              >
                38.0°
              </text>

              {/* Garis Normal 37.0°C */}
              <line
                x1={chartData.padding.left}
                y1={chartData.getY(37.0)}
                x2={chartData.width - chartData.padding.right}
                y2={chartData.getY(37.0)}
                stroke="#10b981"
                strokeDasharray="2 2"
                strokeWidth="0.8"
              />
              <text
                x={chartData.padding.left - 4}
                y={chartData.getY(37.0) + 3}
                fill="#10b981"
                fontSize="6.5"
                textAnchor="end"
              >
                37.0°
              </text>

              {/* Garis Tren */}
              {chartData.points.length > 1 && (
                <path
                  d={chartData.linePath}
                  fill="none"
                  stroke="#fb923c"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Titik Suhu */}
              {chartData.points.map((p) => (
                <g key={p.id}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill={p.val >= 38.0 ? '#ea580c' : '#10b981'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <text
                    x={p.x}
                    y={p.y - 6}
                    fill="#ffffff"
                    fontSize="7"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {p.val}°
                  </text>
                  <text
                    x={p.x}
                    y={chartData.height - chartData.padding.bottom + 10}
                    fill="#64748b"
                    fontSize="6.5"
                    textAnchor="middle"
                  >
                    {p.time}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}
      </div>

      {/* 6. RIWAYAT LOG KRONOLOGIS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300 font-bold px-1">
          <span>Riwayat Suhu & Obat</span>
          <span className="text-[10px] text-slate-400 font-normal">{logs.length} Catatan</span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-3">Belum ada riwayat catatan demam/obat.</p>
          ) : (
            logs.slice(0, 8).map((log) => {
              const isTemp = log.log_type === 'temperature';
              const timeStr = new Date(log.recorded_at).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const dateStr = new Date(log.recorded_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
              });

              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl border ${
                        isTemp
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                      }`}
                    >
                      {isTemp ? <Thermometer className="w-3.5 h-3.5" /> : <Pill className="w-3.5 h-3.5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-white">
                          {isTemp ? `${log.temperature_c} °C` : `${log.medication_name}`}
                        </span>
                        {!isTemp && log.dosage && (
                          <span className="text-indigo-300 font-mono text-[11px] font-bold">
                            ({log.dosage})
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {dateStr} • {timeStr} {log.notes && `• ${log.notes}`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteHealthLog(log.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Hapus"
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
