let audioCtx = null;

const unlock = () => {
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
};

export const playNewOrderSound = () => {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) {
      audioCtx = new AC();
      window.addEventListener("pointerdown", unlock, { once: true });
    }

    const play = () => {
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
      beep(880, 0, 0.15);
      beep(880, 0.2, 0.15);
    };

    if (audioCtx.state === "running") {
      play();
    } else {
      audioCtx.resume().then(play).catch(() => {});
    }
  } catch {
    // ignore audio errors
  }
};
