import { splitTurns, labelTurns, invertLabels, filterIntroBeep } from "./pcm.js";
import { serialize, parse, fmtTime } from "./transcript.js";
import { initLangButton, t, getLang } from "./i18n.js";

const $ = (id) => document.getElementById(id);
const RATE = 16000;
let audio, turns = [], fileName = "", worker, playing;
let currentLang = getLang();
let lastStatusType = "idle"; // "idle", "decoding", "loading", "done", "error", etc.
let lastStatusData = null;

function getSpeakerLabel(speaker, lang) {
  if (speaker === "강사") return t("speakerInstructor", lang);
  if (speaker === "학생") return t("speakerStudent", lang);
  return speaker;
}

function updateStatusText(lang) {
  const statusEl = $("status");
  if (!statusEl) return;
  if (lastStatusType === "idle") {
    statusEl.textContent = t("sttDesc", lang);
  } else if (lastStatusType === "decoding") {
    statusEl.textContent = t("sttDecoding", lang);
  } else if (lastStatusType === "loading") {
    statusEl.textContent = t("sttModelLoading", lang);
  } else if (lastStatusType === "dl" && lastStatusData) {
    statusEl.textContent = t("sttModelDownloading", lang)(lastStatusData.pct);
  } else if (lastStatusType === "progress" && lastStatusData) {
    statusEl.textContent = t("sttProgress", lang)(lastStatusData.done, lastStatusData.total);
  } else if (lastStatusType === "done") {
    statusEl.textContent = t("sttDone", lang)(turns.length);
  } else if (lastStatusType === "no_speech") {
    statusEl.textContent = t("sttNoSpeech", lang);
  } else if (lastStatusType === "file_error" && lastStatusData) {
    statusEl.textContent = t("sttFileError", lang)(lastStatusData.msg);
  } else if (lastStatusType === "saved") {
    statusEl.textContent = t("sttSavedAlert", lang);
  } else if (lastStatusType === "history_loaded") {
    statusEl.textContent = t("sttHistoryLoaded", lang);
  } else if (lastStatusType === "error" && lastStatusData) {
    statusEl.textContent = t("sttError", lang)(lastStatusData.msg);
  }
}

function updateTexts(lang) {
  currentLang = lang;
  document.title = t("sttTitle", lang);
  if ($("title")) $("title").textContent = t("sttTitle", lang);
  if ($("back-link")) $("back-link").textContent = t("backLink", lang);
  if ($("flip")) $("flip").textContent = t("flipLabels", lang);
  if ($("save")) $("save").textContent = t("save", lang);
  if ($("txt")) $("txt").textContent = t("downloadTxt", lang);
  if ($("history-title")) $("history-title").textContent = t("savedHistory", lang);
  if ($("skip-beep-label")) $("skip-beep-label").textContent = t("skipBeep", lang);

  updateFilePickerUI(lang);
  updateStatusText(lang);
  render();
  renderHistory();
}

function setFilePickerDisabled(disabled) {
  if ($("file")) $("file").disabled = disabled;
  if ($("skip-beep")) $("skip-beep").disabled = disabled;
  const picker = $("file-picker");
  if (picker) picker.classList.toggle("disabled", disabled);
}

function updateFilePickerUI(lang) {
  const btn = $("file-btn");
  const nameEl = $("file-name");
  if (btn) btn.textContent = t("chooseFile", lang);
  if (nameEl) {
    if (fileName) {
      nameEl.textContent = fileName;
      nameEl.classList.remove("dim");
    } else {
      nameEl.textContent = t("noFileChosen", lang);
      nameEl.classList.add("dim");
    }
  }
}

function newWorker() {
  worker = new Worker(new URL("./stt-worker.js", import.meta.url), { type: "module" });
  worker.onmessage = ({ data: m }) => {
    const lang = currentLang;
    if (m.type === "status") {
      lastStatusType = "loading";
      updateStatusText(lang);
    } else if (m.type === "dl") {
      lastStatusType = "dl";
      lastStatusData = { pct: m.pct };
      $("bar").hidden = false;
      $("bar").max = 100;
      $("bar").value = m.pct;
      updateStatusText(lang);
    } else if (m.type === "progress") {
      lastStatusType = "progress";
      lastStatusData = { done: m.done, total: m.total };
      $("bar").hidden = false;
      $("bar").max = m.total;
      $("bar").value = m.done;
      updateStatusText(lang);
    } else if (m.type === "turn") {
      turns[m.i].text = m.text;
      const ta = document.querySelector(`#turns [data-i="${m.i}"] textarea`);
      if (ta) ta.value = m.text;
    } else if (m.type === "done") {
      lastStatusType = "done";
      $("bar").hidden = true;
      updateStatusText(lang);
      setFilePickerDisabled(false);
    } else if (m.type === "error") {
      lastStatusType = "error";
      lastStatusData = { msg: m.msg };
      $("bar").hidden = true;
      updateStatusText(lang);
      setFilePickerDisabled(false);
    }
  };
}

function render() {
  $("turns").innerHTML = "";
  $("tools").hidden = !turns.length;
  turns.forEach((tItem, i) => {
    const d = document.createElement("div");
    d.className = "turn " + tItem.speaker;
    d.dataset.i = i;
    d.innerHTML = `<button class="ghost who" type="button"></button><span class="dim"><button class="ghost play" type="button" style="padding:2px 12px">▶</button> <span class="tm"></span></span><textarea></textarea>`;
    d.querySelector(".who").textContent = getSpeakerLabel(tItem.speaker, currentLang);
    d.querySelector(".tm").textContent = `${fmtTime(tItem.startMs)} – ${fmtTime(tItem.endMs)}`;
    d.querySelector("textarea").value = tItem.text;
    d.querySelector("textarea").oninput = (e) => (tItem.text = e.target.value);
    d.querySelector(".who").onclick = () => {
      tItem.speaker = tItem.speaker === "강사" ? "학생" : "강사";
      render();
    };
    d.querySelector(".play").onclick = () => play(tItem);
    $("turns").append(d);
  });
}

function play(tItem) {
  if (!audio) return;
  playing?.stop();
  const ctx = new AudioContext(), src = ctx.createBufferSource();
  src.buffer = audio;
  src.connect(ctx.destination);
  src.start(0, tItem.startMs / 1000, (tItem.endMs - tItem.startMs) / 1000);
  playing = src;
}

$("flip").onclick = () => {
  const l = invertLabels(turns.map((tItem) => tItem.speaker));
  turns.forEach((tItem, i) => (tItem.speaker = l[i]));
  render();
};

$("txt").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([serialize(turns)], { type: "text/plain" }));
  a.download = (fileName.replace(/\.[^.]+$/, "") || "transcript") + ".txt";
  a.click();
};

const KEY = "audioweb.transcripts";
const store = () => JSON.parse(localStorage.getItem(KEY) ?? "[]");

function renderHistory() {
  $("history").innerHTML = "";
  const lang = currentLang;
  const list = store();
  list.forEach((h, idx) => {
    const r = document.createElement("div");
    r.className = "row";
    r.innerHTML = `<span style="flex:1"></span><button class="ghost open" type="button"></button><button class="ghost del" type="button"></button>`;
    r.firstChild.textContent = `${h.name} · ${new Date(h.at).toLocaleString()}`;
    const openBtn = r.querySelector(".open");
    const delBtn = r.querySelector(".del");
    openBtn.textContent = t("open", lang);
    delBtn.textContent = t("delete", lang);

    openBtn.onclick = () => {
      audio = null;
      fileName = h.name;
      updateFilePickerUI(lang);
      turns = parse(h.body);
      render();
      lastStatusType = "history_loaded";
      updateStatusText(lang);
    };
    delBtn.onclick = () => {
      const s = store();
      s.splice(idx, 1);
      localStorage.setItem(KEY, JSON.stringify(s));
      renderHistory();
    };
    $("history").append(r);
  });
  if (!list.length) {
    $("history").innerHTML = `<p class="dim">${t("noHistory", lang)}</p>`;
  }
}

$("save").onclick = () => {
  localStorage.setItem(KEY, JSON.stringify([{ name: fileName, at: Date.now(), body: serialize(turns) }, ...store()]));
  renderHistory();
  lastStatusType = "saved";
  updateStatusText(currentLang);
};

$("file").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  fileName = f.name;
  updateFilePickerUI(currentLang);
  turns = [];
  render();
  setFilePickerDisabled(true);
  try {
    lastStatusType = "decoding";
    updateStatusText(currentLang);
    const ctx = new AudioContext({ sampleRate: RATE });
    audio = await ctx.decodeAudioData(await f.arrayBuffer());
    const mono = new Float32Array(audio.length);
    for (let c = 0; c < audio.numberOfChannels; c++) {
      const ch = audio.getChannelData(c);
      for (let i = 0; i < mono.length; i++) mono[i] += ch[i] / audio.numberOfChannels;
    }
    let ranges = splitTurns(mono, RATE);
    if ($("skip-beep")?.checked) {
      ranges = filterIntroBeep(ranges, mono, RATE);
    }
    if (!ranges.length) {
      lastStatusType = "no_speech";
      updateStatusText(currentLang);
      setFilePickerDisabled(false);
      return;
    }
    const who = labelTurns(ranges.length);
    turns = ranges.map((r, i) => ({
      startMs: Math.round((r.start / RATE) * 1000),
      endMs: Math.round((r.end / RATE) * 1000),
      speaker: who[i],
      text: "",
    }));
    render();
    if (!worker) newWorker();
    worker.postMessage({ pcm: mono, turns: ranges }, [mono.buffer]);
  } catch (err) {
    lastStatusType = "file_error";
    lastStatusData = { msg: err.message ?? err };
    updateStatusText(currentLang);
    setFilePickerDisabled(false);
  }
};

initLangButton("lang-btn", updateTexts);
