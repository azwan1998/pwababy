'use client';

import React, { useState, useEffect } from 'react';
import { Milk, Moon, Shirt, Package, Activity } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  isCenter?: boolean;
}

export function BottomMobileNav() {
  const [activeId, setActiveId] = useState<string>('section-feeding');

  const navItems: NavItem[] = [
    { id: 'section-diaper', label: 'Popok', icon: <Shirt className="w-4 h-4" /> },
    { id: 'section-sleep', label: 'Tidur', icon: <Moon className="w-4 h-4" /> },
    { id: 'section-feeding', label: 'Susu', icon: <Milk className="w-5 h-5" />, isCenter: true },
    { id: 'section-stock', label: 'Stok', icon: <Package className="w-4 h-4" /> },
    { id: 'section-tummy', label: 'Tummy', icon: <Activity className="w-4 h-4" /> },
  ];

  const handleScrollTo = (id: string) => {
    setActiveId(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -70; // Offset untuk header sticky
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Otomatis menyoroti tab aktif saat halaman di-scroll oleh pengguna
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      for (const item of navItems) {
        const el = document.getElementById(item.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveId(item.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [navItems]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-md mx-auto px-4 pb-3 pt-1 pointer-events-auto">
        <div className="bg-card/90 backdrop-blur-xl border border-card-border/80 shadow-2xl rounded-2xl px-2 py-2 flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = activeId === item.id;
            
            // Tombol susu di tengah dibuat lebih menonjol (Hero Button)
            if (item.isCenter) {
              return (
                <button
                  key={item.id}
                  onClick={() => handleScrollTo(item.id)}
                  className={`flex flex-col items-center justify-center -mt-4 py-2 px-3.5 rounded-2xl transition-all duration-200 active:scale-95 shadow-lg ${
                    isActive
                      ? 'bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-black shadow-indigo-600/40 ring-2 ring-indigo-400 scale-110'
                      : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30'
                  }`}
                  title="Susu Bayi"
                >
                  {item.icon}
                  <span className="text-[10px] mt-0.5 font-extrabold leading-none">{item.label}</span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => handleScrollTo(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-90 ${
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
