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

export function isBeepTone(samples, rate, { minFreq = 300, maxFreq = 3500, maxCv = 0.18 } = {}) {
  if (!samples || samples.length < rate * 0.05) return false;

  const zc = [];
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i - 1] < 0 && samples[i] >= 0) || (samples[i - 1] > 0 && samples[i] <= 0)) {
      zc.push(i);
    }
  }

  if (zc.length < 15) return false;

  const intervals = [];
  for (let i = 1; i < zc.length; i++) {
    intervals.push(zc[i] - zc[i - 1]);
  }

  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  if (mean <= 0) return false;

  const estimatedFreq = rate / (2 * mean);
  if (estimatedFreq < minFreq || estimatedFreq > maxFreq) return false;

  let variance = 0;
  for (const iv of intervals) {
    const diff = iv - mean;
    variance += diff * diff;
  }
  const std = Math.sqrt(variance / intervals.length);
  const cv = std / mean;

  return cv <= maxCv;
}

export function filterIntroBeep(turns, fullAudio, rate, { maxStartSec = 3.5, maxDurationSec = 1.2 } = {}) {
  if (!turns || !turns.length) return [];
  const result = [];
  let pastIntro = false;

  for (let i = 0; i < turns.length; i++) {
    const t = turns[i];
    const startSec = t.start / rate;
    const durSec = (t.end - t.start) / rate;

    if (!pastIntro && startSec <= maxStartSec && durSec <= maxDurationSec) {
      const seg = fullAudio.subarray(t.start, t.end);
      if (isBeepTone(seg, rate)) {
        continue;
      } else {
        pastIntro = true;
      }
    } else {
      pastIntro = true;
    }
    result.push(t);
  }

  return result;
}
