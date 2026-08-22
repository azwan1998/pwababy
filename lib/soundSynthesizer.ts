/**
 * Web Audio API Sound Synthesizer for Baby White Noise & Shusher
 * 100% Offline, lightweight, without external MP3 files
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
  private activeNodes: { stop: () => void }[] = [];
  private activeTimerInterval: any = null;
  private currentSoundType: SoundType | null = null;
  private currentVolume: number = 0.6;

  private getAudioContext(): AudioContext {
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
    const ctx = this.getAudioContext();
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
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
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

  // 1. Sintesis Suara Shusher ("Shhh... Shhh...")
  private buildShusher(): { stop: () => void } {
    const ctx = this.getAudioContext();
    const noiseBuffer = this.createNoiseBuffer('pink', 3);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Filter bandpass di frekuensi desisan mulut manusia (1.2kHz - 3.5kHz)
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 2200;
    bandpass.Q.value = 1.5;

    const shushGain = ctx.createGain();
    shushGain.gain.value = 0;

    noiseSource.connect(bandpass);
    bandpass.connect(shushGain);
    if (this.masterGain) shushGain.connect(this.masterGain);

    noiseSource.start();

    // Loop envelope generator: Berdenyut seperti napas shushing tiap 2.2 detik
    const period = 2.2;
    const pulse = () => {
      const now = ctx.currentTime;
      shushGain.gain.cancelScheduledValues(now);
      shushGain.gain.setValueAtTime(0.001, now);
      // Attack lembut
      shushGain.gain.linearRampToValueAtTime(0.9, now + 0.35);
      // Sustain & decay
      shushGain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
    };

    pulse();
    const interval = setInterval(pulse, period * 1000);

    return {
      stop: () => {
        clearInterval(interval);
        try {
          noiseSource.stop();
          noiseSource.disconnect();
          bandpass.disconnect();
          shushGain.disconnect();
        } catch {}
      },
    };
  }

  // 2. Sintesis Rahim & Detak Jantung (Womb Heartbeat)
  private buildWombHeartbeat(): { stop: () => void } {
    const ctx = this.getAudioContext();

    // Background low womb fluid rumble
    const brownBuffer = this.createNoiseBuffer('brown', 4);
    const rumbleSource = ctx.createBufferSource();
    rumbleSource.buffer = brownBuffer;
    rumbleSource.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 140;

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.25;

    rumbleSource.connect(lowpass);
    lowpass.connect(rumbleGain);
    if (this.masterGain) rumbleGain.connect(this.masterGain);
    rumbleSource.start();

    // Rhythm generator: Lub-Dub (~72 BPM)
    const playHeartbeat = () => {
      const now = ctx.currentTime;

      // First Thump (Lub) - 55Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(65, now);
      osc1.frequency.exponentialRampToValueAtTime(40, now + 0.15);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(1.0, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(gain1);
      if (this.masterGain) gain1.connect(this.masterGain);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Second Thump (Dub) - 48Hz (0.28s after Lub)
      const t2 = now + 0.28;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(52, t2);
      osc2.frequency.exponentialRampToValueAtTime(35, t2 + 0.15);

      gain2.gain.setValueAtTime(0.001, t2);
      gain2.gain.linearRampToValueAtTime(0.75, t2 + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.22);

      osc2.connect(gain2);
      if (this.masterGain) gain2.connect(this.masterGain);
      osc2.start(t2);
      osc2.stop(t2 + 0.25);
    };

    playHeartbeat();
    const interval = setInterval(playHeartbeat, 1000); // 60-70 BPM

    return {
      stop: () => {
        clearInterval(interval);
        try {
          rumbleSource.stop();
          rumbleSource.disconnect();
          lowpass.disconnect();
          rumbleGain.disconnect();
        } catch {}
      },
    };
  }

  // 3. Sintesis Suara Hujan Lembut (Rain)
  private buildRain(): { stop: () => void } {
    const ctx = this.getAudioContext();
    const pinkBuffer = this.createNoiseBuffer('pink', 5);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = pinkBuffer;
    noiseSource.loop = true;

    // Filter lowpass & highpass untuk karakteristik tetesan hujan
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1800;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 250;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.8;

    noiseSource.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(rainGain);
    if (this.masterGain) rainGain.connect(this.masterGain);

    noiseSource.start();

    return {
      stop: () => {
        try {
          noiseSource.stop();
          noiseSource.disconnect();
          highpass.disconnect();
          lowpass.disconnect();
          rainGain.disconnect();
        } catch {}
      },
    };
  }

  // 4. Sintesis Ombak Laut (Ocean Waves Swells)
  private buildOcean(): { stop: () => void } {
    const ctx = this.getAudioContext();
    const brownBuffer = this.createNoiseBuffer('brown', 6);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = brownBuffer;
    noiseSource.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 450;

    const waveGain = ctx.createGain();
    waveGain.gain.value = 0.2;

    noiseSource.connect(lowpass);
    lowpass.connect(waveGain);
    if (this.masterGain) waveGain.connect(this.masterGain);

    noiseSource.start();

    // LFO Swell untuk ombak (pasang surut setiap 7 detik)
    const swell = () => {
      const now = ctx.currentTime;
      waveGain.gain.cancelScheduledValues(now);
      lowpass.frequency.cancelScheduledValues(now);

      waveGain.gain.setValueAtTime(0.15, now);
      waveGain.gain.linearRampToValueAtTime(0.85, now + 3.2);
      waveGain.gain.exponentialRampToValueAtTime(0.15, now + 7.0);

      lowpass.frequency.setValueAtTime(300, now);
      lowpass.frequency.linearRampToValueAtTime(750, now + 3.2);
      lowpass.frequency.exponentialRampToValueAtTime(300, now + 7.0);
    };

    swell();
    const interval = setInterval(swell, 7000);

    return {
      stop: () => {
        clearInterval(interval);
        try {
          noiseSource.stop();
          noiseSource.disconnect();
          lowpass.disconnect();
          waveGain.disconnect();
        } catch {}
      },
    };
  }

  // 5. Sintesis Kipas Angin (Bedroom Fan)
  private buildFan(): { stop: () => void } {
    const ctx = this.getAudioContext();
    const pinkBuffer = this.createNoiseBuffer('pink', 4);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = pinkBuffer;
    noiseSource.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 500;

    const notch = ctx.createBiquadFilter();
    notch.type = 'bandpass';
    notch.frequency.value = 320;
    notch.Q.value = 2.0;

    // Motor hum
    const humOsc = ctx.createOscillator();
    const humGain = ctx.createGain();
    humOsc.type = 'sine';
    humOsc.frequency.value = 110;
    humGain.gain.value = 0.08;
    humOsc.connect(humGain);

    const fanGain = ctx.createGain();
    fanGain.gain.value = 0.75;

    noiseSource.connect(lowpass);
    lowpass.connect(fanGain);
    if (this.masterGain) {
      fanGain.connect(this.masterGain);
      humGain.connect(this.masterGain);
    }

    noiseSource.start();
    humOsc.start();

    return {
      stop: () => {
        try {
          noiseSource.stop();
          humOsc.stop();
          noiseSource.disconnect();
          humOsc.disconnect();
          lowpass.disconnect();
          fanGain.disconnect();
          humGain.disconnect();
        } catch {}
      },
    };
  }

  // 6. Sintesis White Noise
  private buildWhiteNoise(): { stop: () => void } {
    const ctx = this.getAudioContext();
    const whiteBuffer = this.createNoiseBuffer('white', 5);
    const source = ctx.createBufferSource();
    source.buffer = whiteBuffer;
    source.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 4000;

    const gain = ctx.createGain();
    gain.gain.value = 0.55;

    source.connect(lowpass);
    lowpass.connect(gain);
    if (this.masterGain) gain.connect(this.masterGain);

    source.start();

    return {
      stop: () => {
        try {
          source.stop();
          source.disconnect();
          lowpass.disconnect();
          gain.disconnect();
        } catch {}
      },
    };
  }

  // 7. Sintesis Brown Noise
  private buildBrownNoise(): { stop: () => void } {
    const ctx = this.getAudioContext();
    const brownBuffer = this.createNoiseBuffer('brown', 5);
    const source = ctx.createBufferSource();
    source.buffer = brownBuffer;
    source.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 800;

    const gain = ctx.createGain();
    gain.gain.value = 0.85;

    source.connect(lowpass);
    lowpass.connect(gain);
    if (this.masterGain) gain.connect(this.masterGain);

    source.start();

    return {
      stop: () => {
        try {
          source.stop();
          source.disconnect();
          lowpass.disconnect();
          gain.disconnect();
        } catch {}
      },
    };
  }

  // Mulai memutar suara dengan fade-in halus
  public play(soundType: SoundType, volume: number = 0.6) {
    if (typeof window === 'undefined') return;

    this.stop(0.1); // Bersihkan suara aktif sebelumnya dengan cepat

    const ctx = this.getAudioContext();
    this.currentSoundType = soundType;
    this.currentVolume = volume;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.6); // Fade-in 0.6s
    this.masterGain.connect(ctx.destination);

    let activeNode: { stop: () => void };

    switch (soundType) {
      case 'shusher':
        activeNode = this.buildShusher();
        break;
      case 'womb_heartbeat':
        activeNode = this.buildWombHeartbeat();
        break;
      case 'rain':
        activeNode = this.buildRain();
        break;
      case 'ocean':
        activeNode = this.buildOcean();
        break;
      case 'fan':
        activeNode = this.buildFan();
        break;
      case 'white_noise':
        activeNode = this.buildWhiteNoise();
        break;
      case 'brown_noise':
        activeNode = this.buildBrownNoise();
        break;
      default:
        activeNode = this.buildShusher();
    }

    this.activeNodes.push(activeNode);
  }

  // Hentikan suara dengan fade-out halus agar bayi tidak kaget
  public stop(fadeDuration: number = 0.6) {
    if (this.masterGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);
      } catch {}
    }

    setTimeout(() => {
      this.activeNodes.forEach((node) => {
        try {
          node.stop();
        } catch {}
      });
      this.activeNodes = [];
      if (this.masterGain) {
        try {
          this.masterGain.disconnect();
        } catch {}
        this.masterGain = null;
      }
    }, fadeDuration * 1000);

    this.currentSoundType = null;
  }

  // Sesuaikan volume secara realtime
  public setVolume(volume: number) {
    this.currentVolume = volume;
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.1);
      } catch {}
    }
  }

  public getCurrentSound(): SoundType | null {
    return this.currentSoundType;
  }
}

export const soundSynthesizer = new SoundSynthesizerEngine();
