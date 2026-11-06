export const STORAGE_KEY = "audioweb_lang";

export const translations = {
  ko: {
    appName: "AudioWeb",
    langToggle: "🌐 English",
    backLink: "← AudioWeb",

    // index.html
    indexDesc: "서버 없이 브라우저 안에서만 동작합니다. 첫 사용 때 음성 모델을 한 번 내려받습니다.",
    ttsCardTitle: "텍스트 → mp3",
    ttsCardDesc: "영어 텍스트를 음성 mp3 파일로 만들기",
    sttCardTitle: "mp3 → 텍스트",
    sttCardDesc: "전화영어 녹음을 강사/학생 대화 텍스트로 받아쓰기",

    // tts.html
    ttsTitle: "텍스트 → mp3",
    ttsPlaceholder: "영어 텍스트를 입력하세요",
    voiceLabels: {
      af_heart: "여성 (미국) Heart",
      af_bella: "여성 (미국) Bella",
      am_michael: "남성 (미국) Michael",
      bf_emma: "여성 (영국) Emma",
      bm_george: "남성 (영국) George",
    },
    speed: "속도",
    makeMp3: "mp3 만들기",
    downloadMp3: "mp3 다운로드",
    ttsModelLoading: "음성 모델 불러오는 중… (최초 1회 다운로드)",
    ttsModelDownloading: (pct) => `모델 다운로드 ${Math.round(pct)}%`,
    ttsConverting: (done, total) => `${done + 1}/${total} 문장 변환 중`,
    ttsDone: (sec, kb) => `완료: ${sec.toFixed(1)}초 분량, ${kb.toFixed(0)}KB`,
    ttsEmptyText: "텍스트가 비어 있습니다.",
    ttsError: (msg) => `오류: ${msg}`,

    // stt.html
    sttTitle: "mp3 → 텍스트",
    sttDesc: "전화영어 mp3(영어, 1:1)를 선택하세요. 먼저 거는 쪽(첫 발화)을 강사로 간주합니다.",
    flipLabels: "라벨 전체 반전",
    save: "저장",
    downloadTxt: ".txt 다운로드",
    speakerInstructor: "강사",
    speakerStudent: "학생",
    savedHistory: "저장한 기록",
    noHistory: "아직 없음",
    open: "열기",
    delete: "삭제",
    sttDecoding: "오디오 디코딩 중…",
    sttModelLoading: "인식 모델 불러오는 중… (최초 1회 다운로드)",
    sttModelDownloading: (pct) => `모델 다운로드 ${Math.round(pct)}%`,
    sttProgress: (done, total) => `${done + 1}/${total} 턴 처리 중`,
    sttDone: (count) => `완료: ${count}개 턴. 틀린 부분은 직접 고칠 수 있어요.`,
    sttNoSpeech: "음성이 감지되지 않았습니다.",
    sttFileError: (msg) => `이 파일을 읽을 수 없습니다 (손상됐거나 지원하지 않는 형식): ${msg}`,
    sttSavedAlert: "저장했습니다.",
    sttHistoryLoaded: "저장된 기록 (원본 오디오는 다시 불러와야 재생됩니다)",
    sttError: (msg) => `오류: ${msg}`,
  },
  en: {
    appName: "AudioWeb",
    langToggle: "🌐 한국어",
    backLink: "← AudioWeb",

    // index.html
    indexDesc: "Runs 100% on-device in your browser. Audio models are downloaded once on first use.",
    ttsCardTitle: "Text → MP3",
    ttsCardDesc: "Convert English text into spoken MP3 audio files",
    sttCardTitle: "MP3 → Text",
    sttCardDesc: "Transcribe phone English audio into instructor/student turns",

    // tts.html
    ttsTitle: "Text → MP3",
    ttsPlaceholder: "Enter English text here...",
    voiceLabels: {
      af_heart: "Female (US) Heart",
      af_bella: "Female (US) Bella",
      am_michael: "Male (US) Michael",
      bf_emma: "Female (UK) Emma",
      bm_george: "Male (UK) George",
    },
    speed: "Speed",
    makeMp3: "Generate MP3",
    downloadMp3: "Download MP3",
    ttsModelLoading: "Loading voice model… (First-time download)",
    ttsModelDownloading: (pct) => `Downloading model: ${Math.round(pct)}%`,
    ttsConverting: (done, total) => `Converting sentence ${done + 1}/${total}`,
    ttsDone: (sec, kb) => `Done: ${sec.toFixed(1)}s audio, ${kb.toFixed(0)}KB`,
    ttsEmptyText: "Text is empty.",
    ttsError: (msg) => `Error: ${msg}`,

    // stt.html
    sttTitle: "MP3 → Text",
    sttDesc: "Select phone English audio (1:1). The caller (first turn) is assumed to be the instructor.",
    flipLabels: "Invert Speaker Labels",
    save: "Save",
    downloadTxt: "Download .txt",
    speakerInstructor: "Instructor",
    speakerStudent: "Student",
    savedHistory: "Saved Transcripts",
    noHistory: "No saved transcripts yet",
    open: "Open",
    delete: "Delete",
    sttDecoding: "Decoding audio…",
    sttModelLoading: "Loading recognition model… (First-time download)",
    sttModelDownloading: (pct) => `Downloading model: ${Math.round(pct)}%`,
    sttProgress: (done, total) => `Processing turn ${done + 1}/${total}`,
    sttDone: (count) => `Completed: ${count} turns. You can edit any mistakes directly.`,
    sttNoSpeech: "No speech detected.",
    sttFileError: (msg) => `Cannot read this file (corrupted or unsupported format): ${msg}`,
    sttSavedAlert: "Saved successfully.",
    sttHistoryLoaded: "Saved transcript (re-import the audio file to listen to playback)",
    sttError: (msg) => `Error: ${msg}`,
  },
};

export function getLang() {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "ko" || saved === "en") return saved;
  }
  return "ko";
}

export function setLang(lang) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, lang);
  }
}

export function toggleLang() {
  const next = getLang() === "ko" ? "en" : "ko";
  setLang(next);
  return next;
}

export function t(key, lang = getLang()) {
  const dict = translations[lang] || translations.ko;
  return dict[key] ?? key;
}

export function initLangButton(btnId = "lang-btn", onUpdate) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  function update() {
    const current = getLang();
    btn.textContent = t("langToggle", current);
    document.documentElement.lang = current;
    if (typeof onUpdate === "function") {
      onUpdate(current);
    }
  }

  btn.onclick = () => {
    toggleLang();
    update();
  };

  update();
}
