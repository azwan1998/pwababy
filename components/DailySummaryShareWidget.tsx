'use client';

import React, { useState } from 'react';
import { Share2, Check, Copy, MessageSquare } from 'lucide-react';
import { useRealtimeFeedings } from '@/hooks/useRealtimeFeedings';
import { useTummyTime } from '@/hooks/useTummyTime';
import { useBabySleep } from '@/hooks/useBabySleep';
import { useDiaperTracker } from '@/hooks/useDiaperTracker';
import { useBabyProfile } from '@/hooks/useBabyProfile';
import { useGrowthLogs } from '@/hooks/useGrowthLogs';

export function DailySummaryShareWidget() {
  const [copied, setCopied] = useState<boolean>(false);
  const { profile } = useBabyProfile();
  const { feedings } = useRealtimeFeedings();
  const { totalMinutesToday: tummyMins, completedSessionsToday: tummyCount } = useTummyTime();
  const { totalSleepMinutesToday: sleepMins } = useBabySleep();
  const { pipisCount, pupCount } = useDiaperTracker();
  const { latestLog, whoStatus } = useGrowthLogs();

  // Hitung total ml susu hari ini
  const todayFeedings = feedings.filter((f) => f.status !== 'dibuang');
  const totalMlToday = todayFeedings.reduce((acc, curr) => acc + curr.amount_ml, 0);

  const todayStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const summaryText = `🍼 *REKAP HARIAN BABY TRACKER* (${todayStr})
👶 *Nama*: ${profile.baby_name} (${latestLog?.weight_kg || profile.weight_kg} kg)

🥛 *Susu*: ${totalMlToday} ml (${todayFeedings.length}x pemberian)
😴 *Tidur*: ${Math.floor(sleepMins / 60)}j ${sleepMins % 60}m
👶 *Tummy Time*: ${tummyCount} sesi (${tummyMins} menit)
🪆 *Popok*: ${pipisCount}x Pipis, ${pupCount}x Pup
📈 *KMS*: ${latestLog ? `${latestLog.weight_kg} kg (${whoStatus.label})` : `${profile.weight_kg} kg`}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(summaryText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="bg-card border border-card-border rounded-2xl p-5 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Share2 className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-white">Rekap Harian</h3>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Tersalin' : 'Salin'}
        </button>
      </div>

      <button
        onClick={handleWhatsAppShare}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95"
      >
        <MessageSquare className="w-4 h-4" /> Bagikan ke WhatsApp
      </button>

    </div>
  );
}
