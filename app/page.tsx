'use client';

import React, { useState } from 'react';
import { Milk, Wifi, History, Heart } from 'lucide-react';
import { useRealtimeFeedings } from '@/hooks/useRealtimeFeedings';
import { useFormulaInventory } from '@/hooks/useFormulaInventory';
import { useBabyProfile } from '@/hooks/useBabyProfile';
import { useGrowthLogs } from '@/hooks/useGrowthLogs';
import { BabyProfileWidget } from '@/components/BabyProfileWidget';
import { QuickFeedingActions } from '@/components/QuickFeedingActions';
import { ActiveBottleTimers } from '@/components/ActiveBottleTimers';
import { StockInventoryWidget } from '@/components/StockInventoryWidget';
import { SleepWakeWindowWidget } from '@/components/SleepWakeWindowWidget';
import { TummyTimeWidget } from '@/components/TummyTimeWidget';
import { DiaperTrackerWidget } from '@/components/DiaperTrackerWidget';
import { DoctorReportWidget } from '@/components/DoctorReportWidget';
import { KmsGrowthWidget } from '@/components/KmsGrowthWidget';
import { WhiteNoiseWidget } from '@/components/WhiteNoiseWidget';
import { FeverMedicationWidget } from '@/components/FeverMedicationWidget';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BottomMobileNav, TabType } from '@/components/BottomMobileNav';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('susu');
  const [babyAgeMonths, setBabyAgeMonths] = useState<number>(2);

  const { profile } = useBabyProfile();
  const { latestLog } = useGrowthLogs();

  const {
    feedings,
    activeFeeding,
    recentFinishedFeeding,
    lastFinishedFeeding,
    createFeeding,
    startDrinking,
    finishFeeding,
    discardFeeding,
  } = useRealtimeFeedings();

  const { stockData, updateInventory, deductStockLocally } = useFormulaInventory();

  // Berat badan terkini dari KMS (atau fallback profile)
  const displayWeight = latestLog?.weight_kg || profile.weight_kg || 5.2;

  // Hitung umur bayi otomatis dari profil birth_date
  const effectiveAgeMonths = React.useMemo(() => {
    if (!profile.birth_date) return babyAgeMonths;
    const dob = new Date(profile.birth_date);
    const now = new Date();
    if (isNaN(dob.getTime())) return babyAgeMonths;
    let months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
    if (now.getDate() < dob.getDate()) months--;
    return Math.max(0, months);
  }, [profile.birth_date, babyAgeMonths]);

  // Trigger pemotongan gram stok lokal & Supabase saat tombol buat susu diklik
  const handleCreateFeeding = (amount_ml: number) => {
    createFeeding(amount_ml);
    deductStockLocally(amount_ml);
  };

  return (
    <main className="max-w-md mx-auto min-h-screen px-4 py-5 pb-28 space-y-4">
      {/* 1. APP HEADER & RINGKASAN MINIMALIS */}
      <header className="flex items-center justify-between bg-card border border-card-border p-3.5 rounded-2xl shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl text-white shadow-md shadow-indigo-900/30">
            <Milk className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1">
              {profile.baby_name || 'Si Kecil'} <Heart className="w-3 h-3 text-rose-400 fill-current" />
            </h1>
            <p className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <Wifi className="w-2.5 h-2.5 text-emerald-400" /> {displayWeight} kg • Realtime
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* 2. LAYAR KONTEN KHUSUS PER-TAB (SUPER BERSIH & FOKUS) */}
      
      {/* TAB 1: SUSU (PEMBERIAN SUSU, ACTIVE TIMER, & RIWAYAT MINUM) */}
      {activeTab === 'susu' && (
        <div className="space-y-4 animate-fade-in">
          <QuickFeedingActions
            activeFeeding={activeFeeding}
            babyAgeMonths={effectiveAgeMonths}
            onCreateFeeding={handleCreateFeeding}
            onStartDrinking={startDrinking}
            onFinishFeeding={finishFeeding}
            onDiscardFeeding={discardFeeding}
          />

          <ActiveBottleTimers
            activeFeeding={activeFeeding}
            recentFinishedFeeding={recentFinishedFeeding}
            lastFinishedFeeding={lastFinishedFeeding}
            babyAgeMonths={effectiveAgeMonths}
            onCreateFeeding={handleCreateFeeding}
          />

          {/* RIWAYAT MINUM TERAKHIR */}
          <section className="bg-card border border-card-border rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-indigo-400" /> Riwayat Minum Hari Ini
              </h3>
              <span className="text-[10px] text-slate-400">{feedings.length} Log</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {feedings.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Belum ada catatan minum hari ini.</p>
              ) : (
                feedings.slice(0, 6).map((log) => {
                  const timeStr = new Date(log.created_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        <div>
                          <p className="font-extrabold text-white">{log.amount_ml} ml</p>
                          <p className="text-[9px] text-slate-400">{timeStr}</p>
                        </div>
                      </div>

                      <div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-semibold capitalize ${
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
        </div>
      )}

      {/* TAB 2: KMS DIGITAL (GRAFIK & PERTUMBUHAN WHO) */}
      {activeTab === 'kms' && (
        <div className="space-y-4 animate-fade-in">
          <KmsGrowthWidget />
        </div>
      )}

      {/* TAB 3: WHITE NOISE & SHUSHER PLAYER */}
      {activeTab === 'suara' && (
        <div className="space-y-4 animate-fade-in">
          <WhiteNoiseWidget />
        </div>
      )}

      {/* TAB: CATATAN DEMAM & OBAT */}
      {activeTab === 'demam' && (
        <div className="space-y-4 animate-fade-in">
          <FeverMedicationWidget />
        </div>
      )}

      {/* TAB 4: TIDUR & WAKE WINDOW */}
      {activeTab === 'tidur' && (
        <div className="space-y-4 animate-fade-in">
          <SleepWakeWindowWidget babyAgeMonths={babyAgeMonths} />
        </div>
      )}

      {/* TAB 3: PELACAK GANTI POPOK */}
      {activeTab === 'popok' && (
        <div className="space-y-4 animate-fade-in">
          <DiaperTrackerWidget />
        </div>
      )}

      {/* TAB 4: STOK KALENG SUSU */}
      {activeTab === 'stok' && (
        <div className="space-y-4 animate-fade-in">
          <StockInventoryWidget stockData={stockData} onUpdateInventory={updateInventory} />
        </div>
      )}

      {/* TAB 5: TUMMY TIME KHUSUS */}
      {activeTab === 'tummy' && (
        <div className="space-y-4 animate-fade-in">
          <TummyTimeWidget />
        </div>
      )}

      {/* TAB 6: REKAP MEDIS DOKTER ANAK (DSA) */}
      {activeTab === 'rekap' && (
        <div className="space-y-4 animate-fade-in">
          <DoctorReportWidget />
        </div>
      )}

      {/* TAB 7: PROFIL BAYI & PANDUAN MEDIS LENGKAP */}
      {activeTab === 'profil' && (
        <div className="space-y-4 animate-fade-in">
          <BabyProfileWidget onAgeChange={setBabyAgeMonths} />
        </div>
      )}

      {/* FOOTER KECIL */}
      <footer className="text-center pt-2">
        <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
          Dibuat dengan <Heart className="w-2.5 h-2.5 text-rose-500 fill-current" /> untuk Ayah & Bunda
        </p>
      </footer>

      {/* 3. HORIZONTALLY SCROLLABLE BOTTOM MOBILE NAVIGATION BAR */}
      <BottomMobileNav activeTab={activeTab} onTabChange={setActiveTab} />

      <PWAInstallPrompt />
    </main>
  );
}
