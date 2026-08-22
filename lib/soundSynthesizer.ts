/**
 * Web Audio API Sound Synthesizer for Baby White Noise & Shusher
 * 100% Offline, lightweight, zero external MP3 dependencies
 */

export type SoundType =
  | 'shusher'
  | 'womb_heartbeat'
  | 'rain'
  | 'ocean'
  | 'fan'
  | 'white_noise'
  | 'brown_noise';

export interface SoundInfo {
  id: SoundType;
  name: string;
  emoji: string;
  description: string;
  color: string;
}

export const SOUND_PRESETS: SoundInfo[] = [
  {
    id: 'shusher',
    name: 'Shusher',
    emoji: '🤫',
    description: 'Suara Shhh ritmis lembut',
    color: 'from-violet-600 to-indigo-600',
  },
  {
    id: 'womb_heartbeat',
    name: 'Rahim & Jantung',
    emoji: '❤️',
    description: 'Detak jantung hangat di rahim',
    color: 'from-rose-600 to-pink-600',
  },
  {
    id: 'rain',
    name: 'Hujan Lembut',
    emoji: '🌧️',
    description: 'Rintik air hujan menenangkan',
    color: 'from-cyan-600 to-blue-600',
  },
  {
    id: 'ocean',
    name: 'Ombak Laut',
    emoji: '🌊',
    description: 'Deburan ombak berirama',
    color: 'from-teal-600 to-emerald-600',
  },
  {
    id: 'fan',
    name: 'Kipas Angin',
    emoji: '💨',
    description: 'Dengung lembut kipas kamar',
    color: 'from-sky-600 to-indigo-600',
  },
  {
    id: 'brown_noise',
    name: 'Brown Noise',
    emoji: '🧸',
    description: 'Frekuensi rendah & hangat',
    color: 'from-amber-700 to-orange-700',
  },
  {
    id: 'white_noise',
    name: 'White Noise',
    emoji: '📻',
    description: 'Peredam kebisingan ruangan',
    color: 'from-slate-600 to-slate-800',
  },
];

class SoundSynthesizerEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeCleanups: (() => void)[] = [];
  private currentSoundType: SoundType | null = null;
  private currentVolume: number = 0.6;
  private stopTimeoutId: any = null;

  public initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Helper untuk membuat Noise Buffer (White, Pink, Brown)
  private createNoiseBuffer(type: 'white' | 'pink' | 'brown', durationSec: number = 5): AudioBuffer {
    const ctx = this.initContext();
    const bufferSize = ctx.sampleRate * durationSec;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.15;
        b6 = white * 0.115926;
      }
    } else if (type === 'brown') {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // Gain compensation
      }
    }

    return buffer;
  }

  // 1. Shusher ("Shhh... Shhh...")
  private buildShusher(destination: GainNode): () => void {
    const ctx = this.initContext();
    const noiseBuffer = this.createNoiseBuffer('pink', 4);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Filter bandpass desisan mulut manusia (1.5kHz - 3.2kHz)
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 2200;
    bandpass.Q.value = 1.4;

    const shushGain = ctx.createGain();
    shushGain.gain.value = 0.01;

    noiseSource.connect(bandpass);
    bandpass.connect(shushGain);
    shushGain.connect(destination);

    noiseSource.start();

    // Loop envelope generator: Berdenyut seperti napas shushing tiap 2.2 detik
    const period = 2.2;
    const pulse = () => {
      if (!this.ctx || this.ctx.state === 'closed') return;
      const now = this.ctx.currentTime;
      shushGain.gain.cancelScheduledValues(now);
      shushGain.gain.setValueAtTime(0.001, now);
      // Attack
      shushGain.gain.linearRampToValueAtTime(0.9, now + 0.35);
      // Sustain & decay
      shushGain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
    };

    pulse();
    const interval = setInterval(pulse, period * 1000);

    return () => {
      clearInterval(interval);
      try {
        noiseSource.stop();
        noiseSource.disconnect();
        bandpass.disconnect();
        shushGain.disconnect();
      } catch {}
    };
  }

  // 2. Rahim & Detak Jantung (Womb Heartbeat)
  private buildWombHeartbeat(destination: GainNode): () => void {
    const ctx = this.initContext();

    // Background low womb fluid rumble
    const brownBuffer = this.createNoiseBuffer('brown', 4);
    const rumbleSource = ctx.createBufferSource();
    rumbleSource.buffer = brownBuffer;
    rumbleSource.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 140;

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.3;

    rumbleSource.connect(lowpass);
    lowpass.connect(rumbleGain);
    rumbleGain.connect(destination);
    rumbleSource.start();

    // Rhythm generator: Lub-Dub (~70 BPM)
    const playHeartbeat = () => {
      if (!this.ctx || this.ctx.state === 'closed') return;
      const now = this.ctx.currentTime;

      // First Thump (Lub) - 58Hz
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(65, now);
      osc1.frequency.exponentialRampToValueAtTime(42, now + 0.15);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.9, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(gain1);
      gain1.connect(destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Second Thump (Dub) - 50Hz (0.28s after Lub)
      const t2 = now + 0.28;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(54, t2);
      osc2.frequency.exponentialRampToValueAtTime(36, t2 + 0.15);

      gain2.gain.setValueAtTime(0.001, t2);
      gain2.gain.linearRampToValueAtTime(0.7, t2 + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.22);

      osc2.connect(gain2);
      gain2.connect(destination);
      osc2.start(t2);
      osc2.stop(t2 + 0.25);
    };

    playHeartbeat();
    const interval = setInterval(playHeartbeat, 950); // ~63 BPM

    return () => {
      clearInterval(interval);
      try {
        rumbleSource.stop();
        rumbleSource.disconnect();
        lowpass.disconnect();
        rumbleGain.disconnect();
      } catch {}
    };
  }

  // 3. Hujan Lembut (Rain)
  private buildRain(destination: GainNode): () => void {
    const ctx = this.initContext();
    const pinkBuffer = this.createNoiseBuffer('pink', 5);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = pinkBuffer;
    noiseSource.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1600;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 300;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.85;

    noiseSource.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(rainGain);
    rainGain.connect(destination);

    noiseSource.start();

    return () => {
      try {
        noiseSource.stop();
        noiseSource.disconnect();
        highpass.disconnect();
        lowpass.disconnect();
        rainGain.disconnect();
      } catch {}
    };
  }

  // 4. Ombak Laut (Ocean Waves Swells)
  private buildOcean(destination: GainNode): () => void {
    const ctx = this.initContext();
    const brownBuffer = this.createNoiseBuffer('brown', 6);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = brownBuffer;
    noiseSource.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 400;

    const waveGain = ctx.createGain();
    waveGain.gain.value = 0.25;

    noiseSource.connect(lowpass);
    lowpass.connect(waveGain);
    waveGain.connect(destination);

    noiseSource.start();

    // LFO Swell untuk ombak (pasang surut setiap 6.5 detik)
    const swell = () => {
      if (!this.ctx || this.ctx.state === 'closed') return;
      const now = this.ctx.currentTime;
      waveGain.gain.cancelScheduledValues(now);
      lowpass.frequency.cancelScheduledValues(now);

      waveGain.gain.setValueAtTime(0.2, now);
      waveGain.gain.linearRampToValueAtTime(0.9, now + 3.0);
      waveGain.gain.exponentialRampToValueAtTime(0.2, now + 6.5);

      lowpass.frequency.setValueAtTime(250, now);
      lowpass.frequency.linearRampToValueAtTime(700, now + 3.0);
      lowpass.frequency.exponentialRampToValueAtTime(250, now + 6.5);
    };

    swell();
    const interval = setInterval(swell, 6500);

    return () => {
      clearInterval(interval);
      try {
        noiseSource.stop();
        noiseSource.disconnect();
        lowpass.disconnect();
        waveGain.disconnect();
      } catch {}
    };
  }

  // 5. Kipas Angin (Bedroom Fan)
  private buildFan(destination: GainNode): () => void {
    const ctx = this.initContext();
    const pinkBuffer = this.createNoiseBuffer('pink', 4);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = pinkBuffer;
    noiseSource.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 450;

    // Motor hum
    const humOsc = ctx.createOscillator();
    const humGain = ctx.createGain();
    humOsc.type = 'sine';
    humOsc.frequency.value = 110;
    humGain.gain.value = 0.1;
    humOsc.connect(humGain);

    const fanGain = ctx.createGain();
    fanGain.gain.value = 0.8;

    noiseSource.connect(lowpass);
    lowpass.connect(fanGain);
    fanGain.connect(destination);
    humGain.connect(destination);

    noiseSource.start();
    humOsc.start();

    return () => {
      try {
        noiseSource.stop();
        humOsc.stop();
        noiseSource.disconnect();
        humOsc.disconnect();
        lowpass.disconnect();
        fanGain.disconnect();
        humGain.disconnect();
      } catch {}
    };
  }

  // 6. White Noise Klasik
  private buildWhiteNoise(destination: GainNode): () => void {
    const ctx = this.initContext();
    const whiteBuffer = this.createNoiseBuffer('white', 5);
    const source = ctx.createBufferSource();
    source.buffer = whiteBuffer;
    source.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3500;

    const gain = ctx.createGain();
    gain.gain.value = 0.6;

    source.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(destination);

    source.start();

    return () => {
      try {
        source.stop();
        source.disconnect();
        lowpass.disconnect();
        gain.disconnect();
      } catch {}
    };
  }

  // 7. Brown Noise
  private buildBrownNoise(destination: GainNode): () => void {
    const ctx = this.initContext();
    const brownBuffer = this.createNoiseBuffer('brown', 5);
    const source = ctx.createBufferSource();
    source.buffer = brownBuffer;
    source.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 750;

    const gain = ctx.createGain();
    gain.gain.value = 0.9;

    source.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(destination);

    source.start();

    return () => {
      try {
        source.stop();
        source.disconnect();
        lowpass.disconnect();
        gain.disconnect();
      } catch {}
    };
  }

  // Hentikan suara secara sinkron dan bersihkan semua node
  public stopImmediate() {
    if (this.stopTimeoutId) {
      clearTimeout(this.stopTimeoutId);
      this.stopTimeoutId = null;
    }

    this.activeCleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch {}
    });
    this.activeCleanups = [];

    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {}
      this.masterGain = null;
    }

    this.currentSoundType = null;
  }

  // Mulai memutar suara dengan fade-in halus
  public play(soundType: SoundType, volume: number = 0.6) {
    if (typeof window === 'undefined') return;

    // Bersihkan suara sebelumnya secara instan
    this.stopImmediate();

    const ctx = this.initContext();
    this.currentSoundType = soundType;
    this.currentVolume = volume;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.01, ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.3); // Fade-in 0.3s
    this.masterGain.connect(ctx.destination);

    let cleanup: () => void;

    switch (soundType) {
      case 'shusher':
        cleanup = this.buildShusher(this.masterGain);
        break;
      case 'womb_heartbeat':
        cleanup = this.buildWombHeartbeat(this.masterGain);
        break;
      case 'rain':
        cleanup = this.buildRain(this.masterGain);
        break;
      case 'ocean':
        cleanup = this.buildOcean(this.masterGain);
        break;
      case 'fan':
        cleanup = this.buildFan(this.masterGain);
        break;
      case 'white_noise':
        cleanup = this.buildWhiteNoise(this.masterGain);
        break;
      case 'brown_noise':
        cleanup = this.buildBrownNoise(this.masterGain);
        break;
      default:
        cleanup = this.buildShusher(this.masterGain);
    }

    this.activeCleanups.push(cleanup);
  }

  // Hentikan suara dengan fade-out halus
  public stop(fadeDuration: number = 0.6) {
    if (this.masterGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0.001, now + fadeDuration);
      } catch {}
    }

    this.stopTimeoutId = setTimeout(() => {
      this.stopImmediate();
    }, fadeDuration * 1000);

    this.currentSoundType = null;
  }

  // Sesuaikan volume secara realtime
  public setVolume(volume: number) {
    this.currentVolume = volume;
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.05);
      } catch {}
    }
  }

  public getCurrentSound(): SoundType | null {
    return this.currentSoundType;
  }
}

export const soundSynthesizer = new SoundSynthesizerEngine();
