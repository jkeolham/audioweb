export function resample(x, from, to) {
  if (from === to) return x;
  const n = Math.floor((x.length * to) / from), out = new Float32Array(n), k = from / to;
  for (let i = 0; i < n; i++) {
    const p = i * k, j = Math.floor(p), f = p - j;
    out[i] = x[j] * (1 - f) + (x[j + 1] ?? x[j]) * f;
  }
  return out;
}

export function floatToInt16(x) {
  const out = new Int16Array(x.length);
  for (let i = 0; i < x.length; i++) { const v = Math.max(-1, Math.min(1, x[i])); out[i] = v < 0 ? v * 32768 : v * 32767; }
  return out;
}

// ponytail: fixed amplitude threshold; add adaptive noise floor if noisy recordings split badly
export function splitTurns(x, rate, { threshold = 0.015, minSilenceMs = 700, minTurnMs = 300 } = {}) {
  const win = Math.floor(rate * 0.02), minSil = Math.ceil(minSilenceMs / 20), turns = [];
  let start = -1, lastVoice = -1, silent = 0;
  const close = () => {
    if (start >= 0 && ((lastVoice - start) / rate) * 1000 >= minTurnMs) turns.push({ start, end: lastVoice });
    start = -1;
  };
  for (let w = 0; w * win < x.length; w++) {
    let peak = 0;
    for (let i = w * win, e = Math.min(i + win, x.length); i < e; i++) peak = Math.max(peak, Math.abs(x[i]));
    if (peak >= threshold) { if (start < 0) start = w * win; lastVoice = Math.min((w + 1) * win, x.length); silent = 0; }
    else if (start >= 0 && ++silent >= minSil) close();
  }
  close();
  return turns;
}

export const labelTurns = (n) => Array.from({ length: n }, (_, i) => (i % 2 ? "학생" : "강사"));
export const invertLabels = (l) => l.map((s) => (s === "강사" ? "학생" : "강사"));
