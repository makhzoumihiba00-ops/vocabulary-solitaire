/* ============================================================
 * Vocabulary Solitaire — audio.js
 * Lightweight Web Audio sound engine (no audio files needed).
 * Sounds are synthesised on the fly; the AudioContext is created
 * lazily on the first user gesture so browser autoplay rules and
 * the mute setting are always respected.
 * ============================================================ */
"use strict";

const Sound = (() => {
  let ctx = null;
  let master = null;
  let muted = false;
  try { muted = localStorage.getItem("vocabSolitaire.muted") === "1"; } catch (e) { /* storage unavailable */ }

  function ensure() {
    if (muted) return false;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
      } catch (e) { return false; }
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return true;
  }

  /* Short enveloped tone. f2 = optional frequency ramp target. */
  function tone({ f = 440, f2 = 0, t = 0, d = 0.15, type = "sine", v = 0.25 }) {
    if (!ensure()) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const now = ctx.currentTime + t;
    osc.type = type;
    osc.frequency.setValueAtTime(f, now);
    if (f2) osc.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), now + d);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(v, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + d);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + d + 0.05);
  }

  /* Filtered noise burst — used for card slide / snap effects. */
  function noise({ t = 0, d = 0.06, v = 0.2, fc = 1600, q = 0.8 }) {
    if (!ensure()) return;
    const n = Math.max(1, Math.floor(ctx.sampleRate * d));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const flt = ctx.createBiquadFilter();
    flt.type = "bandpass";
    flt.frequency.value = fc;
    flt.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = v;
    src.connect(flt);
    flt.connect(g);
    g.connect(master);
    src.start(ctx.currentTime + t);
  }

  return {
    unlock() { ensure(); },
    isMuted() { return muted; },
    setMuted(m) {
      muted = !!m;
      try { localStorage.setItem("vocabSolitaire.muted", muted ? "1" : "0"); } catch (e) { /* ignore */ }
    },
    flip()    { noise({ d: 0.05, v: 0.30, fc: 2400 }); tone({ f: 880, d: 0.045, type: "triangle", v: 0.05 }); },
    place()   { noise({ d: 0.05, v: 0.32, fc: 900, q: 0.6 }); tone({ f: 200, f2: 120, d: 0.09, v: 0.20 }); },
    correct() { tone({ f: 659, d: 0.10, type: "triangle", v: 0.15 }); tone({ f: 880, t: 0.08, d: 0.14, type: "triangle", v: 0.15 }); },
    wrong()   { tone({ f: 220, f2: 150, d: 0.20, type: "sawtooth", v: 0.09 }); tone({ f: 160, f2: 120, t: 0.02, d: 0.22, v: 0.13 }); },
    complete(){ [523, 659, 784, 1047].forEach((f, i) => tone({ f, t: i * 0.09, d: 0.16, type: "triangle", v: 0.14 })); },
    victory() {
      [523, 659, 784, 659, 784, 1047, 1319].forEach((f, i) => tone({ f, t: i * 0.13, d: 0.22, type: "triangle", v: 0.14 }));
      noise({ t: 0.1, d: 0.4, v: 0.05, fc: 5000, q: 0.3 });
    },
    click()   { tone({ f: 600, d: 0.04, v: 0.07 }); },
    hint()    { tone({ f: 1245, d: 0.09, v: 0.09 }); tone({ f: 1661, t: 0.09, d: 0.12, v: 0.07 }); }
  };
})();
