import { initLangButton, t } from "./i18n.js";

const $ = (id) => document.getElementById(id);

function updateTexts(lang) {
  const desc = $("desc");
  const ttsTitle = $("tts-card-title");
  const ttsDesc = $("tts-card-desc");
  const sttTitle = $("stt-card-title");
  const sttDesc = $("stt-card-desc");

  if (desc) desc.textContent = t("indexDesc", lang);
  if (ttsTitle) ttsTitle.textContent = t("ttsCardTitle", lang);
  if (ttsDesc) ttsDesc.textContent = t("ttsCardDesc", lang);
  if (sttTitle) sttTitle.textContent = t("sttCardTitle", lang);
  if (sttDesc) sttDesc.textContent = t("sttCardDesc", lang);
}

initLangButton("lang-btn", updateTexts);
