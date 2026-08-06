let audioCtx = null;

const ensureAudio = () => {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) {
    audioCtx = new AC();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
  }
  return audioCtx;
};

const unlock = () => {
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
};

// Prepare the AudioContext so the first user gesture unlocks playback
export const initSoundOnFirstGesture = () => {
  try {
    ensureAudio();
  } catch {
    // ignore audio errors
  }
};

const beep = (freq, start, duration) => {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.001, audioCtx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(
    0.3,
    audioCtx.currentTime + start + 0.02
  );
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioCtx.currentTime + start + duration
  );
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(audioCtx.currentTime + start);
  osc.stop(audioCtx.currentTime + start + duration + 0.05);
};

export const playNewOrderSound = () => {
  try {
    const ctx = ensureAudio();
    if (!ctx) return;

    const play = () => {
      beep(880, 0, 0.15);
      beep(880, 0.2, 0.15);
    };

    if (ctx.state === "running") {
      play();
    } else {
      ctx.resume().then(play).catch(() => {});
    }
  } catch {
    // ignore audio errors
  }
};
