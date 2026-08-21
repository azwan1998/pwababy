'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    // Cek preference tersimpan di localStorage atau otomatis berdasarkan jam lokal
    const savedTheme = localStorage.getItem('pwababy_theme') as 'dark' | 'light' | null;
    
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      const currentHour = new Date().getHours();
      const isNight = currentHour >= 18 || currentHour < 6;
      const defaultTheme = isNight ? 'dark' : 'light';
      setTheme(defaultTheme);
      applyTheme(defaultTheme);
    }
  }, []);

  const applyTheme = (newTheme: 'dark' | 'light') => {
    const root = document.documentElement;
    if (newTheme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('pwababy_theme', nextTheme);
    applyTheme(nextTheme);
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 shadow-sm ${
        theme === 'dark'
          ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
          : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
      }`}
      title="Beralih Mode Siang / Malam"
    >
      {theme === 'dark' ? (
        <>
          <Moon className="w-3.5 h-3.5 fill-current text-amber-300" />
          <span>Mode Malam</span>
        </>
      ) : (
        <>
          <Sun className="w-3.5 h-3.5 fill-current text-amber-600" />
          <span>Mode Siang</span>
        </>
      )}
    </button>
  );
}
