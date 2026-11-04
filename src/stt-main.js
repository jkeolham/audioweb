import { splitTurns, labelTurns, invertLabels } from "./pcm.js";
import { serialize, parse, fmtTime } from "./transcript.js";

const $ = (id) => document.getElementById(id);
const RATE = 16000;
let audio, turns = [], fileName = "", worker, playing;

function newWorker() {
  worker = new Worker(new URL("./stt-worker.js", import.meta.url), { type: "module" });
  worker.onmessage = ({ data: m }) => {
    if (m.type === "status") $("status").textContent = m.msg;
    else if (m.type === "dl") { $("bar").hidden = false; $("bar").max = 100; $("bar").value = m.pct; $("status").textContent = `모델 다운로드 ${Math.round(m.pct)}%`; }
    else if (m.type === "progress") { $("bar").hidden = false; $("bar").max = m.total; $("bar").value = m.done; $("status").textContent = `${m.done + 1}/${m.total} 턴 처리 중`; }
    else if (m.type === "turn") { turns[m.i].text = m.text; const ta = document.querySelector(`#turns [data-i="${m.i}"] textarea`); if (ta) ta.value = m.text; }
    else if (m.type === "done") { $("bar").hidden = true; $("status").textContent = `완료: ${turns.length}개 턴. 틀린 부분은 직접 고칠 수 있어요.`; $("file").disabled = false; }
    else if (m.type === "error") { $("bar").hidden = true; $("status").textContent = "오류: " + m.msg; $("file").disabled = false; }
  };
}

function render() {
  $("turns").innerHTML = ""; $("tools").hidden = !turns.length;
  turns.forEach((t, i) => {
    const d = document.createElement("div");
    d.className = "turn " + t.speaker; d.dataset.i = i;
    d.innerHTML = `<button class="ghost who"></button><span class="dim"><button class="ghost play" style="padding:2px 12px">▶</button> <span class="tm"></span></span><textarea></textarea>`;
    d.querySelector(".who").textContent = t.speaker;
    d.querySelector(".tm").textContent = `${fmtTime(t.startMs)} – ${fmtTime(t.endMs)}`;
    d.querySelector("textarea").value = t.text;
    d.querySelector("textarea").oninput = (e) => (t.text = e.target.value);
    d.querySelector(".who").onclick = () => { t.speaker = t.speaker === "강사" ? "학생" : "강사"; render(); };
    d.querySelector(".play").onclick = () => play(t);
    $("turns").append(d);
  });
}

function play(t) {
  if (!audio) return;
  playing?.stop();
  const ctx = new AudioContext(), src = ctx.createBufferSource();
  src.buffer = audio; src.connect(ctx.destination);
  src.start(0, t.startMs / 1000, (t.endMs - t.startMs) / 1000);
  playing = src;
}

$("flip").onclick = () => { const l = invertLabels(turns.map((t) => t.speaker)); turns.forEach((t, i) => (t.speaker = l[i])); render(); };
$("txt").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([serialize(turns)], { type: "text/plain" }));
  a.download = (fileName.replace(/\.[^.]+$/, "") || "transcript") + ".txt"; a.click();
};

const KEY = "audioweb.transcripts";
const store = () => JSON.parse(localStorage.getItem(KEY) ?? "[]");
function renderHistory() {
  $("history").innerHTML = "";
  store().forEach((h, idx) => {
    const r = document.createElement("div"); r.className = "row";
    r.innerHTML = `<span style="flex:1"></span><button class="ghost open">열기</button><button class="ghost del">삭제</button>`;
    r.firstChild.textContent = `${h.name} · ${new Date(h.at).toLocaleString()}`;
    r.querySelector(".open").onclick = () => { audio = null; fileName = h.name; turns = parse(h.body); render(); $("status").textContent = "저장된 기록 (원본 오디오는 다시 불러와야 재생됩니다)"; };
    r.querySelector(".del").onclick = () => { const s = store(); s.splice(idx, 1); localStorage.setItem(KEY, JSON.stringify(s)); renderHistory(); };
    $("history").append(r);
  });
  if (!store().length) $("history").innerHTML = '<p class="dim">아직 없음</p>';
}
$("save").onclick = () => {
  localStorage.setItem(KEY, JSON.stringify([{ name: fileName, at: Date.now(), body: serialize(turns) }, ...store()]));
  renderHistory(); $("status").textContent = "저장했습니다.";
};

$("file").onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  fileName = f.name; turns = []; render(); $("file").disabled = true;
  try {
    $("status").textContent = "오디오 디코딩 중…";
    const ctx = new AudioContext({ sampleRate: RATE });
    audio = await ctx.decodeAudioData(await f.arrayBuffer());
    const mono = new Float32Array(audio.length);
    for (let c = 0; c < audio.numberOfChannels; c++) { const ch = audio.getChannelData(c); for (let i = 0; i < mono.length; i++) mono[i] += ch[i] / audio.numberOfChannels; }
    const ranges = splitTurns(mono, RATE);
    if (!ranges.length) { $("status").textContent = "음성이 감지되지 않았습니다."; $("file").disabled = false; return; }
    const who = labelTurns(ranges.length);
    turns = ranges.map((r, i) => ({ startMs: Math.round((r.start / RATE) * 1000), endMs: Math.round((r.end / RATE) * 1000), speaker: who[i], text: "" }));
    render();
    if (!worker) newWorker();
    worker.postMessage({ pcm: mono, turns: ranges }, [mono.buffer]);
  } catch (err) {
    $("status").textContent = "이 파일을 읽을 수 없습니다 (손상됐거나 지원하지 않는 형식): " + (err.message ?? err);
    $("file").disabled = false;
  }
};
renderHistory();
