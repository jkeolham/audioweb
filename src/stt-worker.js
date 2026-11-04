import { pipeline } from "@huggingface/transformers";

let asr;
const RATE = 16000;

self.onmessage = async ({ data: { pcm, turns } }) => {
  try {
    if (!asr) {
      postMessage({ type: "status", msg: "인식 모델 불러오는 중… (최초 1회 다운로드)" });
      asr = await pipeline("automatic-speech-recognition", "Xenova/whisper-base.en", {
        dtype: "q8", device: "wasm",
        progress_callback: (p) => p.status === "progress" && postMessage({ type: "dl", pct: p.progress }),
      });
    }
    for (let i = 0; i < turns.length; i++) {
      postMessage({ type: "progress", done: i, total: turns.length });
      const { start, end } = turns[i];
      const seg = pcm.subarray(start, end);
      // Whisper hallucinates on very short clips
      const text = seg.length < RATE * 0.25 ? "" : (await asr(seg, { chunk_length_s: 30 })).text.trim();
      postMessage({ type: "turn", i, text });
    }
    postMessage({ type: "done" });
  } catch (e) { postMessage({ type: "error", msg: String(e.message ?? e) }); }
};
