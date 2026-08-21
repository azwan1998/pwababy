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
  const isProgrammaticScroll = useRef<boolean>(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'popok', label: 'Popok', icon: <Shirt className="w-5 h-5" /> },
    { id: 'tidur', label: 'Tidur', icon: <Moon className="w-5 h-5" /> },
    { id: 'susu', label: 'Susu', icon: <Milk className="w-5 h-5" /> },
    { id: 'stok', label: 'Stok', icon: <Package className="w-5 h-5" /> },
    { id: 'tummy', label: 'Tummy', icon: <Activity className="w-5 h-5" /> },
    { id: 'rekap', label: 'Rekap', icon: <Share2 className="w-5 h-5" /> },
    { id: 'profil', label: 'Profil', icon: <User className="w-5 h-5" /> },
  ];

  // Fungsi menggeser menu tertentu ke posisi tengah persis
  const scrollToTab = (tabId: TabType) => {
    if (!containerRef.current) return;
    const btn = containerRef.current.querySelector(`[data-tab="${tabId}"]`) as HTMLElement;
    if (btn) {
      isProgrammaticScroll.current = true;
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 350);
    }
  };

  useEffect(() => {
    scrollToTab(activeTab);
  }, [activeTab]);

  // Listener saat pengguna menggeser/swipe dengan jari: item yang mendarat di tengah langsung AKTIF otomatis!
  const handleScroll = () => {
    if (isProgrammaticScroll.current || !containerRef.current) return;

    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    scrollTimeout.current = setTimeout(() => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const containerCenter = container.scrollLeft + container.clientWidth / 2;

      let closestTab: TabType = activeTab;
      let minDistance = Infinity;

      const buttons = container.querySelectorAll('[data-tab]');
      buttons.forEach((btnNode) => {
        const btn = btnNode as HTMLElement;
        const btnCenter = btn.offsetLeft + btn.offsetWidth / 2;
        const distance = Math.abs(containerCenter - btnCenter);

        if (distance < minDistance) {
          minDistance = distance;
          closestTab = btn.getAttribute('data-tab') as TabType;
        }
      });

      if (closestTab && closestTab !== activeTab) {
        onTabChange(closestTab);
        if ('vibrate' in navigator) {
          try {
            navigator.vibrate(25);
          } catch {}
        }
      }
    }, 60);
  };

  const handleItemClick = (id: TabType) => {
    onTabChange(id);
    scrollToTab(id);
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(30);
      } catch {}
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-md mx-auto px-3 pb-3 pt-2 pointer-events-auto relative">
        {/* CONTAINER UTAMA BAR DENGAN GLASSMORPHISM & SPOTLIGHT CAROUSEL */}
        <div className="relative bg-card/95 backdrop-blur-2xl border border-card-border/80 shadow-[0_12px_40px_rgba(0,0,0,0.3)] rounded-3xl p-1.5 flex items-center transition-colors duration-300">
          
          {/* INDIKATOR SPOTLIGHT AURA DI POSISI TENGAH */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-16 h-16 rounded-full bg-indigo-500/15 blur-md pointer-events-none" />

          {/* CAROUSEL MENU YANG DI-SWIPE / DITEKAN KE TENGAH */}
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="w-full flex items-center overflow-x-auto no-scrollbar scroll-smooth py-1 gap-2.5 snap-x snap-mandatory"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              paddingLeft: 'calc(50% - 32px)',
              paddingRight: 'calc(50% - 32px)',
            }}
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  data-tab={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`snap-center flex flex-col items-center justify-center transition-all duration-300 active:scale-95 flex-shrink-0 relative ${
                    isActive
                      ? '-mt-4 w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white font-black ring-4 ring-indigo-500/30 scale-105 shadow-xl shadow-indigo-600/50 animate-pulse-glow z-10'
                      : 'w-13 h-13 py-1.5 px-3 rounded-xl nav-inactive-btn text-slate-400 hover:text-slate-200 hover:scale-105 opacity-65 hover:opacity-100'
                  }`}
                  title={item.label}
                >
                  <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-90'}`}>
                    {item.icon}
                  </div>
                  <span className={`text-[10px] mt-0.5 tracking-tight leading-none ${isActive ? 'font-extrabold text-white' : 'font-semibold'}`}>
                    {item.label}
                  </span>

                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300 absolute -bottom-1 shadow-sm animate-ping" />
                  )}
                </button>
              );
            })}
          </div>

        </div>
      </div>
    </nav>
  );
}
