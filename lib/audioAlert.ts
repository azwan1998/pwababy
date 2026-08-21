/**
 * Web Audio API Sound Synthesizer & Vibration API
 * Menghasilkan bunyi alarm/chime lembut untuk notifikasi timer selesai di PWA
 */

let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    if (!globalAudioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        globalAudioCtx = new AudioContextClass();
      }
    }

    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }

    return globalAudioCtx;
  } catch (err) {
    console.warn('AudioContext init error:', err);
    return null;
  }
}

// Inisialisasi audio context saat pengguna pertama kali mengetuk layar HP
if (typeof window !== 'undefined') {
  const handleFirstInteraction = () => {
    getAudioContext();
    window.removeEventListener('click', handleFirstInteraction);
    window.removeEventListener('touchstart', handleFirstInteraction);
  };
  window.addEventListener('click', handleFirstInteraction);
  window.addEventListener('touchstart', handleFirstInteraction);
}

export function playAlertSound(type: 'chime' | 'warning' | 'finish' = 'chime') {
  if (typeof window === 'undefined') return;

  // Trigger vibration jika didukung perangkat
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 400]);
    } catch {
      // Ignore vibration error
    }
  }

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (type === 'finish') {
      // Melodi 4 nada lembut (C5, E5, G5, C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.18);

        gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.18);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + index * 0.18 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.18 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + index * 0.18);
        osc.stop(ctx.currentTime + index * 0.18 + 0.45);
      });
    } else {
      // Chime singkat
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}
