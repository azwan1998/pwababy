'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { soundSynthesizer, SoundType } from '@/lib/soundSynthesizer';

export function useWhiteNoise() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSound, setCurrentSound] = useState<SoundType>('shusher');
  const [volume, setVolume] = useState<number>(0.6);
  const [timerMinutes, setTimerMinutes] = useState<number | null>(30); // Default 30 menit
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(30 * 60);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);

  const wakeLockRef = useRef<any>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Request / Release Screen Wake Lock API
  const requestWakeLock = async () => {
    if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockRef.current.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      } catch {
        setWakeLockActive(false);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  };

  // Mulai memutar suara
  const play = useCallback(
    (sound?: SoundType) => {
      const targetSound = sound || currentSound;
      setCurrentSound(targetSound);
      soundSynthesizer.play(targetSound, volume);
      setIsPlaying(true);

      // Reset timer countdown jika ada
      if (timerMinutes) {
        setRemainingSeconds(timerMinutes * 60);
      } else {
        setRemainingSeconds(null);
      }

      requestWakeLock();
    },
    [currentSound, volume, timerMinutes]
  );

  // Hentikan suara
  const stop = useCallback(() => {
    soundSynthesizer.stop(0.6);
    setIsPlaying(false);
    releaseWakeLock();

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      stop();
    } else {
      play(currentSound);
    }
  };

  const selectSound = (type: SoundType) => {
    setCurrentSound(type);
    if (isPlaying) {
      soundSynthesizer.play(type, volume);
    }
  };

  const changeVolume = (newVol: number) => {
    setVolume(newVol);
    soundSynthesizer.setVolume(newVol);
  };

  const setSleepTimer = (minutes: number | null) => {
    setTimerMinutes(minutes);
    if (minutes) {
      setRemainingSeconds(minutes * 60);
    } else {
      setRemainingSeconds(null);
    }
  };

  // Interval ticker countdown saat memutar dengan timer
  useEffect(() => {
    if (isPlaying && timerMinutes && remainingSeconds !== null) {
      timerIntervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev === null || prev <= 1) {
            // Waktu habis -> fade out perlahan
            soundSynthesizer.stop(2.0);
            setIsPlaying(false);
            releaseWakeLock();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isPlaying, timerMinutes]);

  // Bersihkan audio synthesizer saat unmount
  useEffect(() => {
    return () => {
      soundSynthesizer.stop(0.1);
      releaseWakeLock();
    };
  }, []);

  return {
    isPlaying,
    currentSound,
    volume,
    timerMinutes,
    remainingSeconds,
    wakeLockActive,
    togglePlay,
    play,
    stop,
    selectSound,
    changeVolume,
    setSleepTimer,
  };
}
