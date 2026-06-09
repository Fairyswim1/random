let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  options: {
    type?: OscillatorType;
    volume?: number;
    delay?: number;
    slideTo?: number;
  } = {},
) {
  const ctx = getCtx();
  if (!ctx) return;

  const { type = "sine", volume = 0.12, delay = 0, slideTo } = options;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), start + duration);
  }

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function unlockGameAudio() {
  getCtx();
}

export function playMoveSound(direction: 1 | -1) {
  if (direction === 1) {
    playTone(360, 0.07, { type: "triangle", volume: 0.1, slideTo: 620 });
    playTone(620, 0.05, { type: "triangle", volume: 0.08, delay: 0.04 });
  } else {
    playTone(520, 0.07, { type: "triangle", volume: 0.1, slideTo: 280 });
    playTone(280, 0.05, { type: "triangle", volume: 0.08, delay: 0.04 });
  }
}

export function playResultSound() {
  const fanfare = [
    { freq: 392, delay: 0 },
    { freq: 494, delay: 0.1 },
    { freq: 587, delay: 0.2 },
    { freq: 784, delay: 0.32 },
  ];

  fanfare.forEach(({ freq, delay }) => {
    playTone(freq, 0.22, { type: "sine", volume: 0.14, delay });
    playTone(freq * 2, 0.12, { type: "triangle", volume: 0.05, delay: delay + 0.02 });
  });
}
