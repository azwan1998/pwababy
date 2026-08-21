'use client';

import React, { useState } from 'react';
import { Milk, Wifi, History, Heart, Moon } from 'lucide-react';
import { useRealtimeFeedings } from '@/hooks/useRealtimeFeedings';
import { useFormulaInventory } from '@/hooks/useFormulaInventory';
import { BabyProfileWidget } from '@/components/BabyProfileWidget';
import { QuickFeedingActions } from '@/components/QuickFeedingActions';
import { ActiveBottleTimers } from '@/components/ActiveBottleTimers';
import { StockInventoryWidget } from '@/components/StockInventoryWidget';
import { SleepWakeWindowWidget } from '@/components/SleepWakeWindowWidget';
import { TummyTimeWidget } from '@/components/TummyTimeWidget';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

export default function DashboardPage() {
  const [babyAgeMonths, setBabyAgeMonths] = useState<number>(2);

  const {
    feedings,
    activeFeeding,
    createFeeding,
    startDrinking,
    finishFeeding,
    discardFeeding,
  } = useRealtimeFeedings();

  const { stockData, updateInventory, deductStockLocally } = useFormulaInventory();

  // Trigger pemotongan gram stok lokal & Supabase saat tombol buat susu diklik
  const handleCreateFeeding = (amount_ml: number) => {
    createFeeding(amount_ml);
    deductStockLocally(amount_ml);
  };

  return (
    <main className="max-w-md mx-auto min-h-screen px-4 py-6 pb-24 space-y-5">
      {/* 1. APP HEADER & REALTIME STATUS */}
      <header className="flex items-center justify-between bg-card border border-card-border p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl text-white shadow-md shadow-indigo-900/40">
            <Milk className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
              Baby Tracker <Moon className="w-3.5 h-3.5 text-amber-300" />
            </h1>
            <p className="text-[11px] text-slate-400">Night-Friendly PWA App</p>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <Wifi className="w-3 h-3" /> Realtime
          </span>
          <span className="text-[9px] text-slate-500 mt-1">HP Ayah & Ibu Connected</span>
        </div>
      </header>

      {/* 2. WIDGET PROFIL BAYI (HITUNG UMUR, BB KG, & REKOMENDASI SUSU MEDIS) */}
      <BabyProfileWidget onAgeChange={setBabyAgeMonths} />

      {/* 3. TOMBOL QUICK ACTION FEEDING (PRESET BEBELAC: 65, 100, 135, 165, 200, 235 ML) */}
      <QuickFeedingActions
        activeFeeding={activeFeeding}
        babyAgeMonths={babyAgeMonths}
        onCreateFeeding={handleCreateFeeding}
        onStartDrinking={startDrinking}
        onFinishFeeding={finishFeeding}
        onDiscardFeeding={discardFeeding}
      />

      {/* 4. SMART TIMERS (COUNTDOWN BASI & POSISI TEGAK 20 MIN) */}
      <ActiveBottleTimers activeFeeding={activeFeeding} />

      {/* 5. WIDGET DURASI TIDUR & WAKE WINDOW HARIAN */}
      <SleepWakeWindowWidget babyAgeMonths={babyAgeMonths} />

      {/* 6. WIDGET STOK KALENG (PRESET 350g, 600g, 775g) & ESTIMASI WAKTU BELI */}
      <StockInventoryWidget stockData={stockData} onUpdateInventory={updateInventory} />

      {/* 7. WIDGET TUMMY TIME HARIAN */}
      <TummyTimeWidget />

      {/* 8. RIWAYAT MINUM TERAKHIR */}
      <section className="bg-card border border-card-border rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" /> Riwayat Minum Terakhir
          </h3>
          <span className="text-[10px] text-slate-400">{feedings.length} Log</span>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {feedings.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">Belum ada catatan minum hari ini.</p>
          ) : (
            feedings.slice(0, 8).map((log) => {
              const timeStr = new Date(log.created_at).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <div>
                      <p className="font-extrabold text-white">{log.amount_ml} ml</p>
                      <p className="text-[10px] text-slate-400">{timeStr}</p>
                    </div>
                  </div>

                  <div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                        log.status === 'selesai'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : log.status === 'dibuang'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {log.status === 'dibuat'
                        ? 'Dibuat'
                        : log.status === 'mulai_minum'
                        ? 'Minum'
                        : log.status === 'selesai'
                        ? 'Selesai'
                        : 'Dibuang'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* FOOTER & PWA INSTALL BANNER */}
      <footer className="text-center py-2 space-y-1">
        <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
          Dibuat dengan <Heart className="w-3 h-3 text-rose-500 fill-current" /> untuk Ayah & Ibu
        </p>
      </footer>

      <PWAInstallPrompt />
    </main>
  );
}
