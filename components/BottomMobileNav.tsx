'use client';

import React, { useRef, useEffect } from 'react';
import { Milk, Moon, Shirt, Package, Activity, Share2, User } from 'lucide-react';

export type TabType = 'popok' | 'tidur' | 'susu' | 'stok' | 'tummy' | 'rekap' | 'profil';

interface BottomMobileNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function BottomMobileNav({ activeTab, onTabChange }: BottomMobileNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const navItems: { id: TabType; label: string; icon: React.ReactNode; isCenter?: boolean }[] = [
    { id: 'popok', label: 'Popok', icon: <Shirt className="w-4 h-4" /> },
    { id: 'tidur', label: 'Tidur', icon: <Moon className="w-4 h-4" /> },
    { id: 'susu', label: 'Susu', icon: <Milk className="w-5 h-5" />, isCenter: true },
    { id: 'stok', label: 'Stok', icon: <Package className="w-4 h-4" /> },
    { id: 'tummy', label: 'Tummy', icon: <Activity className="w-4 h-4" /> },
    { id: 'rekap', label: 'Rekap', icon: <Share2 className="w-4 h-4" /> },
    { id: 'profil', label: 'Profil', icon: <User className="w-4 h-4" /> },
  ];

  // Auto-scroll tombol yang aktif agar selalu berada di posisi tengah layar saat dipilih
  useEffect(() => {
    if (containerRef.current) {
      const activeBtn = containerRef.current.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTab]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-md mx-auto px-4 pb-3 pt-1 pointer-events-auto">
        <div
          ref={containerRef}
          className="bg-card/95 backdrop-blur-xl border border-card-border/80 shadow-2xl rounded-2xl px-2 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;

            // Tombol Susu Besar Menonjol (Hero Center Button)
            if (item.isCenter) {
              return (
                <button
                  key={item.id}
                  data-tab={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex flex-col items-center justify-center -mt-4 py-2 px-4 rounded-2xl transition-all duration-200 active:scale-95 shadow-lg flex-shrink-0 min-w-[62px] ${
                    isActive
                      ? 'bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-black shadow-indigo-600/40 ring-2 ring-indigo-400 scale-105'
                      : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30'
                  }`}
                  title="Susu Bayi"
                >
                  {item.icon}
                  <span className="text-[10px] mt-0.5 font-extrabold leading-none">{item.label}</span>
                </button>
              );
            }

            // Tombol Menu Lainnya (Ikon di atas, Teks di bawah - Ukuran Besar & Nyaman Ditekan)
            return (
              <button
                key={item.id}
                data-tab={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-90 flex-shrink-0 min-w-[58px] ${
                  isActive
                    ? 'bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-600/30 scale-105'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.icon}
                <span className="text-[10px] mt-1 font-semibold leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
