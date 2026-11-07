import { initLangButton, t, getLang } from "./i18n.js";

const $ = (id) => document.getElementById(id);

let currentLang = getLang();
let isPreviewLoading = false;
let isPlayingPreview = false;
let isGeneratingMp3 = false;
let previewCtx = null;
let previewSource = null;

function populateVoices(lang) {
  const select = $("voice");
  const selected = select.value;
  select.innerHTML = "";
  const voiceMap = t("voiceLabels", lang);
  for (const [k, v] of Object.entries(voiceMap)) {
    select.add(new Option(v, k));
  }
  if (selected && voiceMap[selected]) {
    select.value = selected;
  }
}

function updateButtons(lang = currentLang) {
  const previewBtn = $("preview");
  const goBtn = $("go");

  if (previewBtn) {
    previewBtn.textContent = isPlayingPreview ? t("stopPreview", lang) : t("preview", lang);
    previewBtn.disabled = isGeneratingMp3 || isPreviewLoading;
    if (isPlayingPreview) {
      previewBtn.classList.add("playing");
    } else {
      previewBtn.classList.remove("playing");
    }
  }

  if (goBtn) {
    goBtn.textContent = t("makeMp3", lang);
    goBtn.disabled = isGeneratingMp3 || isPreviewLoading || isPlayingPreview;
  }
}

function updateTexts(lang) {
  currentLang = lang;
  document.title = t("ttsTitle", lang);
  if ($("title")) $("title").textContent = t("ttsTitle", lang);
  if ($("back-link")) $("back-link").textContent = t("backLink", lang);
  if ($("text")) $("text").placeholder = t("ttsPlaceholder", lang);
  if ($("speed-label")) $("speed-label").textContent = t("speed", lang);
  if ($("dl")) $("dl").textContent = t("downloadMp3", lang);
  populateVoices(lang);
  updateButtons(lang);
}

$("speed").oninput = () => ($("speedv").textContent = (+$("speed").value).toFixed(1) + "x");

function stopPreview(triggerStatus = true) {
  if (previewSource) {
    try {
      previewSource.stop();
    } catch (_) {}
    previewSource.disconnect();
    previewSource = null;
  }
  if (previewCtx) {
    try {
      previewCtx.close();
    } catch (_) {}
    previewCtx = null;
  }
  if (isPlayingPreview) {
    isPlayingPreview = false;
    updateButtons();
    if (triggerStatus && $("status").textContent === t("ttsPreviewing", currentLang)) {
      $("status").textContent = t("ttsPreviewDone", currentLang);
    }
  }
}

function playPcm(pcm, sampleRate = 24000) {
  stopPreview(false);
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  previewCtx = new AudioContextClass({ sampleRate });
  const buffer = previewCtx.createBuffer(1, pcm.length, sampleRate);
  buffer.getChannelData(0).set(pcm);

  previewSource = previewCtx.createBufferSource();
  previewSource.buffer = buffer;
  previewSource.connect(previewCtx.destination);
  previewSource.onended = () => {
    stopPreview(true);
  };

  previewSource.start(0);
  isPlayingPreview = true;
  updateButtons();
  $("status").textContent = t("ttsPreviewing", currentLang);
}

const worker = new Worker(new URL("./tts-worker.js", import.meta.url), { type: "module" });
let url;

worker.onmessage = ({ data: m }) => {
  const lang = currentLang;
  if (m.type === "status") {
    $("status").textContent = t("ttsModelLoading", lang);
  } else if (m.type === "dl") {
    $("bar").hidden = false;
    $("bar").max = 100;
    $("bar").value = m.pct;
    $("status").textContent = t("ttsModelDownloading", lang)(m.pct);
  } else if (m.type === "progress") {
    $("bar").hidden = false;
    $("bar").max = m.total;
    $("bar").value = m.done;
    $("status").textContent = t("ttsConverting", lang)(m.done, m.total);
  } else if (m.type === "preview_ready") {
    isPreviewLoading = false;
    $("bar").hidden = true;
    playPcm(m.pcm, m.sampleRate);
  } else if (m.type === "done") {
    isGeneratingMp3 = false;
    updateButtons();
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(m.blob);
    $("player").src = url;
    $("player").hidden = false;
    const name = ($("text").value.trim().split(/\s+/).slice(0, 4).join("_").replace(/[^\w]/g, "") || "audio") + ".mp3";
    $("dl").href = url;
    $("dl").download = name;
    $("dl").hidden = false;
    $("bar").hidden = true;
    $("status").textContent = t("ttsDone", lang)(m.seconds, m.blob.size / 1024);
  } else if (m.type === "error") {
    isPreviewLoading = false;
    isGeneratingMp3 = false;
    updateButtons();
    const errorText = m.msg === "텍스트가 비어 있습니다." ? t("ttsEmptyText", lang) : m.msg;
    $("status").textContent = t("ttsError", lang)(errorText);
    $("bar").hidden = true;
  }
};

$("preview").onclick = () => {
  if (isPlayingPreview) {
    stopPreview(true);
    return;
  }

  const text = $("text").value.trim();
  if (!text) {
    $("status").textContent = t("ttsEmptyText", currentLang);
    return;
  }

  stopPreview(false);
  $("player").hidden = true;
  $("dl").hidden = true;
  isPreviewLoading = true;
  updateButtons();

  worker.postMessage({
    action: "preview",
    text,
    voice: $("voice").value,
    speed: +$("speed").value,
  });
};

$("go").onclick = () => {
  stopPreview(false);

  const text = $("text").value.trim();
  if (!text) {
    $("status").textContent = t("ttsEmptyText", currentLang);
    return;
  }

  isGeneratingMp3 = true;
  updateButtons();
  $("dl").hidden = true;
  $("player").hidden = true;

  worker.postMessage({
    action: "generate",
    text,
    voice: $("voice").value,
    speed: +$("speed").value,
  });
};

initLangButton("lang-btn", updateTexts);
