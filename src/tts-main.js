import { initLangButton, t, getLang } from "./i18n.js";

const $ = (id) => document.getElementById(id);

let currentLang = getLang();

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

function updateTexts(lang) {
  currentLang = lang;
  document.title = t("ttsTitle", lang);
  if ($("title")) $("title").textContent = t("ttsTitle", lang);
  if ($("back-link")) $("back-link").textContent = t("backLink", lang);
  if ($("text")) $("text").placeholder = t("ttsPlaceholder", lang);
  if ($("speed-label")) $("speed-label").textContent = t("speed", lang);
  if ($("go")) $("go").textContent = t("makeMp3", lang);
  if ($("dl")) $("dl").textContent = t("downloadMp3", lang);
  populateVoices(lang);
}

$("speed").oninput = () => ($("speedv").textContent = (+$("speed").value).toFixed(1) + "x");

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
  } else if (m.type === "done") {
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(m.blob);
    $("player").src = url;
    $("player").hidden = false;
    const name = ($("text").value.trim().split(/\s+/).slice(0, 4).join("_").replace(/[^\w]/g, "") || "audio") + ".mp3";
    $("dl").href = url;
    $("dl").download = name;
    $("dl").hidden = false;
    $("bar").hidden = true;
    $("go").disabled = false;
    $("status").textContent = t("ttsDone", lang)(m.seconds, m.blob.size / 1024);
  } else if (m.type === "error") {
    const errorText = m.msg === "텍스트가 비어 있습니다." ? t("ttsEmptyText", lang) : m.msg;
    $("status").textContent = t("ttsError", lang)(errorText);
    $("bar").hidden = true;
    $("go").disabled = false;
  }
};

$("go").onclick = () => {
  const text = $("text").value.trim();
  if (!text) {
    $("status").textContent = t("ttsEmptyText", currentLang);
    return;
  }
  $("go").disabled = true;
  $("dl").hidden = true;
  $("player").hidden = true;
  worker.postMessage({ text, voice: $("voice").value, speed: +$("speed").value });
};

initLangButton("lang-btn", updateTexts);
