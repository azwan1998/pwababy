'use client';

import React, { useState, useEffect } from 'react';
import { PackageCheck, AlertCircle, ShoppingCart, Settings, Save, RefreshCw } from 'lucide-react';
import { FormulaStockPrediction } from '@/lib/supabase/types';

interface StockInventoryWidgetProps {
  stockData: FormulaStockPrediction | null;
  onUpdateInventory: (payload: {
    brand_name: string;
    can_weight_grams: number;
    current_weight_grams: number;
    grams_per_scoop: number;
    ml_per_scoop: number;
  }) => void;
}

export function StockInventoryWidget({ stockData, onUpdateInventory }: StockInventoryWidgetProps) {
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [brandName, setBrandName] = useState<string>(stockData?.brand_name || 'Bebelac 1');
  const [canWeight, setCanWeight] = useState<number>(stockData?.can_weight_grams || 600);
  const [currentWeight, setCurrentWeight] = useState<number>(stockData?.current_weight_grams || 600);
  const [gramsPerScoop, setGramsPerScoop] = useState<number>(stockData?.grams_per_scoop || 4.6);
  const [mlPerScoop, setMlPerScoop] = useState<number>(stockData?.ml_per_scoop || 30);

  // Sync state lokal dengan props stockData saat ada perubahan / reset
  useEffect(() => {
    if (stockData) {
      setBrandName(stockData.brand_name || 'Bebelac 1');
      setCanWeight(stockData.can_weight_grams || 600);
      setCurrentWeight(stockData.current_weight_grams ?? 600);
      setGramsPerScoop(stockData.grams_per_scoop || 4.6);
      setMlPerScoop(stockData.ml_per_scoop || 30);
    }
  }, [stockData]);

  // Preset Pilihan Berat Kemasan Susu (350g, 600g, 775g)
  const weightPresets = [350, 600, 775];

  if (!stockData) {
    return (
      <div className="bg-card border border-card-border rounded-2xl p-5 shadow-lg animate-pulse space-y-3">
        <div className="h-4 bg-slate-800 rounded w-1/3" />
        <div className="h-8 bg-slate-800 rounded" />
      </div>
    );
  }

  const stockPercent = Math.min(100, Math.max(0, Math.round((stockData.current_weight_grams / stockData.can_weight_grams) * 100)));

  // Prediksi Tanggal Beli Susu
  const estimatedDays = stockData.estimated_days_left;
  const targetBuyDate = new Date();
  targetBuyDate.setDate(targetBuyDate.getDate() + Math.floor(estimatedDays));
  const formattedBuyDate = targetBuyDate.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const handleQuickResetCan = (grams: number) => {
    const updatedBrand = brandName && brandName !== 'Nutrilon Royal 1' ? brandName : 'Bebelac 1';
    setBrandName(updatedBrand);
    setCanWeight(grams);
    setCurrentWeight(grams);

    onUpdateInventory({
      brand_name: updatedBrand,
      can_weight_grams: grams,
      current_weight_grams: grams,
      grams_per_scoop: gramsPerScoop,
      ml_per_scoop: mlPerScoop,
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateInventory({
      brand_name: brandName,
      can_weight_grams: Number(canWeight),
      current_weight_grams: Number(currentWeight),
      grams_per_scoop: Number(gramsPerScoop),
      ml_per_scoop: Number(mlPerScoop),
    });
    setIsEditing(false);
  };

  return (
    <div className="bg-card border border-card-border rounded-2xl p-5 shadow-xl space-y-4">
      {/* HEADER WIDGET */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Stok Kaleng & Prediksi Beli</h3>
            <p className="text-xs font-semibold text-amber-400">{stockData.brand_name || 'Bebelac 1'}</p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          title="Pengaturan Kaleng"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* MODAL / FORM EDIT STOK */}
      {isEditing ? (
        <form onSubmit={handleSave} className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-indigo-400">Pengaturan Takaran & Stok Kaleng</h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] text-slate-400 block mb-1">Merk Susu Formula</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[11px] text-slate-400 block mb-1">Preset Buka Kotak/Kaleng Baru:</label>
              <div className="grid grid-cols-3 gap-2">
                {weightPresets.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setCanWeight(g);
                      setCurrentWeight(g);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                      canWeight === g
                        ? 'bg-indigo-600 border-indigo-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {g} Gram
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Berat Kaleng Utuh (g)</label>
              <input
                type="number"
                value={canWeight}
                onChange={(e) => setCanWeight(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Sisa Stok Saat Ini (g)</label>
              <input
                type="number"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
              <Save className="w-3.5 h-3.5" /> Simpan
            </button>
          </div>
        </form>
      ) : (
        /* VISUALISASI STOK DAN ESTIMASI PREDIKSI */
        <div className="space-y-4">
          {/* QUICK BUTTON RESET BUKA KOTAK BARU */}
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Buka Kotak/Kaleng Baru:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {weightPresets.map((g) => (
                <button
                  key={g}
                  onClick={() => handleQuickResetCan(g)}
                  className="py-1.5 px-2 bg-slate-800 hover:bg-indigo-900/80 active:bg-indigo-800 border border-slate-700 hover:border-indigo-500 rounded-lg text-xs font-bold text-slate-200 transition active:scale-95"
                >
                  +{g}g Baru
                </button>
              ))}
            </div>
          </div>

          {/* BAR KEMAJUAN STOK */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Sisa Stok Gram:</span>
              <span className="text-amber-400 font-bold">
                {stockData.current_weight_grams}g / {stockData.can_weight_grams}g ({stockPercent}%)
              </span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  stockPercent < 20
                    ? 'bg-rose-500'
                    : stockPercent < 40
                    ? 'bg-amber-400'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                }`}
                style={{ width: `${stockPercent}%` }}
              />
            </div>
          </div>

          {/* KARTU RINGKASAN ESTIMASI PREDIKSI */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <p className="text-[11px] text-slate-400">Rata2 Harian (7 Hari)</p>
              <p className="text-base font-extrabold text-white mt-1">
                {stockData.avg_daily_grams || 77.4} <span className="text-xs text-slate-400">g/hari</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                ~{stockData.avg_daily_ml || 540} ml / hari
              </p>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShoppingCart className="w-3.5 h-3.5 text-amber-400" /> Estimasi Habis
              </p>
              <p className="text-base font-extrabold text-amber-400 mt-1">
                {stockData.estimated_days_left < 99 ? `${stockData.estimated_days_left} Hari` : 'Tidak terbatas'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Target Beli: <span className="text-white font-medium">{formattedBuyDate}</span>
              </p>
            </div>
          </div>

          {/* ALERT REKOMENDASI PEMBELIAN */}
          {stockData.estimated_days_left <= 2 && (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-rose-300 text-xs">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <div>
                <p className="font-bold">⚠️ Perhatian: Stok Susu Hampir Habis!</p>
                <p className="text-[11px] text-rose-200/80">
                  Disarankan membeli kaleng/kotak susu baru sebelum {formattedBuyDate}.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
