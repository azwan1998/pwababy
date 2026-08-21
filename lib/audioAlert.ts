/**
 * Web Audio API Sound Synthesizer
 * Menghasilkan bunyi alarm/chime lembut untuk notifikasi timer selesai di PWA
 * tanpa bergantung pada file audio mp3 eksternal.
 */
export function playAlertSound(type: 'chime' | 'warning' | 'finish' = 'chime') {
  if (typeof window === 'undefined') return;

  // Trigger vibration jika didukung perangkat (HP Ayah / Ibu)
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 400]);
    } catch {
      // Ignore vibration error
    }
  }

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    
    if (type === 'finish') {
      // Melodi 3 nada lembut (Do-Mi-Sol) untuk penanda 20 menit posisi tegak selesai
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
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
      // Chime singkat untuk klik tombol / preset
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5

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
