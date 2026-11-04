export function fmtTime(ms) {
  const t = Math.floor(ms / 100), m = Math.floor(t / 600), s = Math.floor((t % 600) / 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${t % 10}`;
}
const toMs = (s) => { const [m, r] = s.split(":"); return Math.round((+m * 60 + +r) * 1000); };

export const serialize = (turns) =>
  turns.map((t) => `[${fmtTime(t.startMs)}-${fmtTime(t.endMs)}] ${t.speaker}: ${t.text}`).join("\n") + "\n";

export function parse(text) {
  return text.split("\n").filter(Boolean).map((l) => {
    const m = l.match(/^\[(\d+:\d+\.\d)-(\d+:\d+\.\d)\] (강사|학생): ([\s\S]*)$/);
    if (!m) throw new Error("bad line: " + l);
    return { startMs: toMs(m[1]), endMs: toMs(m[2]), speaker: m[3], text: m[4] };
  });
}
