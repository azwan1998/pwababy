'use client';

import React, { useRef, useEffect } from 'react';
import { Milk, Moon, Shirt, Package, Activity, Share2, User } from 'lucide-react';

export type TabType = 'susu' | 'tidur' | 'popok' | 'stok' | 'tummy' | 'rekap' | 'profil';

interface BottomMobileNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function BottomMobileNav({ activeTab, onTabChange }: BottomMobileNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'susu', label: 'Susu', icon: <Milk className="w-4 h-4" /> },
    { id: 'tidur', label: 'Tidur', icon: <Moon className="w-4 h-4" /> },
    { id: 'popok', label: 'Popok', icon: <Shirt className="w-4 h-4" /> },
    { id: 'stok', label: 'Stok Kaleng', icon: <Package className="w-4 h-4" /> },
    { id: 'tummy', label: 'Tummy Time', icon: <Activity className="w-4 h-4" /> },
    { id: 'rekap', label: 'Rekap Harian', icon: <Share2 className="w-4 h-4" /> },
    { id: 'profil', label: 'Profil Bayi', icon: <User className="w-4 h-4" /> },
  ];

  // Auto-scroll menu yang aktif agar selalu terlihat di tengah layar saat dipilih
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
      <div className="max-w-md mx-auto px-3 pb-3 pt-1 pointer-events-auto">
        <div
          ref={containerRef}
          className="bg-card/95 backdrop-blur-xl border border-card-border/80 shadow-2xl rounded-2xl p-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                data-tab={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl whitespace-nowrap text-xs font-bold transition-all duration-200 active:scale-95 flex-shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
