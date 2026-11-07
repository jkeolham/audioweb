import { KokoroTTS } from "kokoro-js";
import { Mp3Encoder } from "@breezystack/lamejs";
import { floatToInt16 } from "./pcm.js";

let tts;
const RATE = 24000;

function sentences(text) {
  const out = [];
  for (const s of text.match(/[^.!?\n]+[.!?]*/g) ?? []) {
    let t = s.trim();
    while (t.length > 300) { const i = t.lastIndexOf(" ", 300); out.push(t.slice(0, i > 0 ? i : 300)); t = t.slice(i > 0 ? i : 300).trim(); }
    if (t) out.push(t);
  }
  return out;
}

function mp3(pcm) {
  const enc = new Mp3Encoder(1, RATE, 64), x = floatToInt16(pcm), parts = [];
  for (let i = 0; i < x.length; i += 1152) { const b = enc.encodeBuffer(x.subarray(i, i + 1152)); if (b.length) parts.push(b); }
  parts.push(enc.flush());
  return new Blob(parts, { type: "audio/mpeg" });
}

self.onmessage = async ({ data: { text, voice, speed, action = "generate" } }) => {
  try {
    if (!tts) {
      postMessage({ type: "status", msg: "음성 모델 불러오는 중… (최초 1회 다운로드)" });
      tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
        dtype: "q8", device: "wasm",
        progress_callback: (p) => p.status === "progress" && postMessage({ type: "dl", file: p.file, pct: p.progress }),
      });
    }
    const list = sentences(text);
    if (!list.length) throw new Error("텍스트가 비어 있습니다.");
    const targetList = action === "preview" ? list.slice(0, 3) : list;
    const gap = new Float32Array(Math.floor(RATE * 0.25)), chunks = [];
    for (let i = 0; i < targetList.length; i++) {
      postMessage({ type: "progress", done: i, total: targetList.length, action });
      const a = await tts.generate(targetList[i], { voice, speed });
      chunks.push(a.audio, gap);
    }
    const all = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
    let p = 0; for (const c of chunks) { all.set(c, p); p += c.length; }

    if (action === "preview") {
      postMessage({ type: "preview_ready", pcm: all, sampleRate: RATE, seconds: all.length / RATE });
    } else {
      postMessage({ type: "done", blob: mp3(all), seconds: all.length / RATE });
    }
  } catch (e) { postMessage({ type: "error", msg: String(e.message ?? e), action }); }
};
