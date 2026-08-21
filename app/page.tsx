'use client';

import React, { useState } from 'react';
import { Milk, Wifi, History, Heart } from 'lucide-react';
import { useRealtimeFeedings } from '@/hooks/useRealtimeFeedings';
import { useFormulaInventory } from '@/hooks/useFormulaInventory';
import { BabyProfileWidget } from '@/components/BabyProfileWidget';
import { QuickFeedingActions } from '@/components/QuickFeedingActions';
import { ActiveBottleTimers } from '@/components/ActiveBottleTimers';
import { StockInventoryWidget } from '@/components/StockInventoryWidget';
import { SleepWakeWindowWidget } from '@/components/SleepWakeWindowWidget';
import { TummyTimeWidget } from '@/components/TummyTimeWidget';
import { DiaperTrackerWidget } from '@/components/DiaperTrackerWidget';
import { DailySummaryShareWidget } from '@/components/DailySummaryShareWidget';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BottomMobileNav } from '@/components/BottomMobileNav';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

export default function DashboardPage() {
  const [babyAgeMonths, setBabyAgeMonths] = useState<number>(2);

  const {
    feedings,
    activeFeeding,
    recentFinishedFeeding,
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
    <main className="max-w-md mx-auto min-h-screen px-4 py-6 pb-28 space-y-5">
      {/* 1. APP HEADER & THEME SWITCHER */}
      <header className="flex items-center justify-between bg-card border border-card-border p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl text-white shadow-md shadow-indigo-900/40">
            <Milk className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
              Baby Tracker
            </h1>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <Wifi className="w-3 h-3 text-emerald-400" /> Realtime Connected
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* 2. WIDGET PROFIL BAYI */}
      <div id="section-profile">
        <BabyProfileWidget onAgeChange={setBabyAgeMonths} />
      </div>

      {/* 3. SECTION PEMBERIAN SUSU & SMART TIMERS */}
      <div id="section-feeding" className="space-y-5 scroll-mt-20">
        <QuickFeedingActions
          activeFeeding={activeFeeding}
          babyAgeMonths={babyAgeMonths}
          onCreateFeeding={handleCreateFeeding}
          onStartDrinking={startDrinking}
          onFinishFeeding={finishFeeding}
          onDiscardFeeding={discardFeeding}
        />
        <ActiveBottleTimers activeFeeding={activeFeeding} recentFinishedFeeding={recentFinishedFeeding} />
      </div>

      {/* 4. SECTION TIDUR & WAKE WINDOW */}
      <div id="section-sleep" className="scroll-mt-20">
        <SleepWakeWindowWidget babyAgeMonths={babyAgeMonths} />
      </div>

      {/* 5. SECTION PELACAK POPOK */}
      <div id="section-diaper" className="scroll-mt-20">
        <DiaperTrackerWidget />
      </div>

      {/* 6. SECTION STOK KALENG SUSU */}
      <div id="section-stock" className="scroll-mt-20">
        <StockInventoryWidget stockData={stockData} onUpdateInventory={updateInventory} />
      </div>

      {/* 7. SECTION TUMMY TIME */}
      <div id="section-tummy" className="scroll-mt-20">
        <TummyTimeWidget />
      </div>

      {/* 8. SHARE REKAP HARIAN KE WHATSAPP */}
      <DailySummaryShareWidget />

      {/* 9. RIWAYAT MINUM TERAKHIR */}
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
          Dibuat dengan <Heart className="w-3 h-3 text-rose-500 fill-current" /> untuk Ayah & Bunda
        </p>
      </footer>


      {/* 10. BOTTOM MOBILE NAVIGATION BAR (FLOATING NATIVE LOOK) */}
      <BottomMobileNav />

      <PWAInstallPrompt />
    </main>
  );
}
