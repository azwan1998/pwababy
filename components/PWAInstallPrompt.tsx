'use client';

import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, Share, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);

  useEffect(() => {
    // 1. Register Service Worker untuk PWA
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('PWA Service Worker registered:', reg.scope))
        .catch((err) => console.warn('SW registration error:', err));
    }

    // 2. Deteksi apakah dibuka di iPhone / iPad (iOS)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    // Cek apakah sudah dalam mode Standalone (sudah terinstall di homescreen)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone;

    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      // Tampilkan banner tip install iOS jika belum di-dismiss di session ini
      const dismissed = sessionStorage.getItem('pwa_ios_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    }

    // 3. Tangkap event beforeinstallprompt (Android / Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    if (isIOS) {
      sessionStorage.setItem('pwa_ios_dismissed', 'true');
    }
  };

  if (!showPrompt) return null;

  return (
    <>
      {/* BANNER PROMPT BAWAH */}
      <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto bg-card/95 backdrop-blur-xl border border-indigo-500/40 p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-bounce-short">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Pasang Aplikasi PWA</h4>
            <p className="text-[10px] text-slate-300">Akses cepat & full-screen di Layar Utama HP</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition active:scale-95 shadow-md shadow-indigo-600/20"
          >
            <Download className="w-3.5 h-3.5" /> Pasang
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MODAL PANDUAN KHUSUS IPHONE (iOS SAFARI) */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-card-border p-6 rounded-3xl max-w-xs w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center border border-indigo-500/30">
              <Smartphone className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white">Pasang di iPhone (iOS)</h3>
              <p className="text-xs text-slate-400">Ikuti 2 langkah mudah berikut di Safari:</p>
            </div>

            <div className="space-y-2.5 text-left text-xs bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2.5 text-slate-200">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">1</span>
                <span>Tekan tombol <strong>Bagikan (Share)</strong> <Share className="w-3.5 h-3.5 inline text-indigo-400 ml-0.5" /> di menu bawah Safari.</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-200">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">2</span>
                <span>Gulir ke bawah & pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong> <PlusSquare className="w-3.5 h-3.5 inline text-emerald-400 ml-0.5" />.</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
            >
              Mengerti & Siap Pasang
            </button>
          </div>
        </div>
      )}
    </>
  );
}
