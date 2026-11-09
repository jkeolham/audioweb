import test from "node:test";
import assert from "node:assert/strict";
import { resample, splitTurns, labelTurns, invertLabels, floatToInt16, filterIntroBeep, isBeepTone } from "../src/pcm.js";
import { serialize, parse, fmtTime } from "../src/transcript.js";
import { t, translations, getLang, setLang, toggleLang } from "../src/i18n.js";

const tone = (sec, rate, freq = 1000, amp = 0.5) =>
  Float32Array.from({ length: Math.floor(sec * rate) }, (_, i) => amp * Math.sin((2 * Math.PI * freq * i) / rate));
const speechSim = (sec, rate, amp = 0.5) => {
  // Voice simulation with multiple formant-like frequencies and frequency modulation
  return Float32Array.from({ length: Math.floor(sec * rate) }, (_, i) => {
    const f0 = 120 + 30 * Math.sin((2 * Math.PI * 3 * i) / rate);
    const s = Math.sin((2 * Math.PI * f0 * i) / rate) * 0.4 +
              Math.sin((2 * Math.PI * 700 * i) / rate) * 0.3 +
              Math.sin((2 * Math.PI * 2400 * i) / rate) * 0.2 +
              (Math.random() - 0.5) * 0.1;
    return amp * s;
  });
};
const silence = (sec, rate) => new Float32Array(Math.floor(sec * rate));
const cat = (...a) => { const o = new Float32Array(a.reduce((s, x) => s + x.length, 0)); let p = 0; for (const x of a) { o.set(x, p); p += x.length; } return o; };

test("resample 48k->16k yields a third of the samples", () => {
  assert.equal(resample(tone(1, 48000), 48000, 16000).length, 16000);
});
test("resample same rate returns same data", () => {
  const x = tone(1, 16000); assert.deepEqual(resample(x, 16000, 16000), x);
});
test("splitTurns finds two turns separated by a long pause", () => {
  const r = 16000, x = cat(tone(2, r), silence(1, r), tone(2, r));
  const tTurns = splitTurns(x, r);
  assert.equal(tTurns.length, 2);
  assert.ok(tTurns[0].start < 0.1 * r && Math.abs(tTurns[0].end - 2 * r) < 0.2 * r);
  assert.ok(Math.abs(tTurns[1].start - 3 * r) < 0.2 * r);
});
test("splitTurns keeps a short pause inside one turn", () => {
  const r = 16000;
  assert.equal(splitTurns(cat(tone(1, r), silence(0.3, r), tone(1, r)), r).length, 1);
});
test("splitTurns drops blips shorter than minTurn", () => {
  const r = 16000;
  assert.equal(splitTurns(cat(tone(0.1, r), silence(1, r), tone(2, r)), r).length, 1);
});
test("splitTurns on all-silence returns no turns", () => {
  assert.deepEqual(splitTurns(silence(5, 16000), 16000), []);
});
test("labelTurns alternates starting with instructor", () => {
  assert.deepEqual(labelTurns(3), ["강사", "학생", "강사"]);
});
test("invertLabels swaps every label", () => {
  assert.deepEqual(invertLabels(["강사", "학생"]), ["학생", "강사"]);
});
test("floatToInt16 clamps", () => {
  assert.deepEqual([...floatToInt16(Float32Array.of(2, -2, 0))], [32767, -32768, 0]);
});
test("transcript round-trips including colons in text", () => {
  const turns = [{ startMs: 0, endMs: 5400, speaker: "강사", text: "Hi: how are you?" }, { startMs: 61000, endMs: 63200, speaker: "학생", text: "Fine." }];
  assert.deepEqual(parse(serialize(turns)), turns);
});
test("fmtTime formats mm:ss.t", () => assert.equal(fmtTime(61250), "01:01.2"));

// i18n tests
test("i18n translations cover both ko and en", () => {
  assert.ok(translations.ko);
  assert.ok(translations.en);
  assert.equal(t("makeMp3", "ko"), "mp3 만들기");
  assert.equal(t("makeMp3", "en"), "Generate MP3");
  assert.equal(t("preview", "ko"), "미리듣기");
  assert.equal(t("preview", "en"), "Preview");
  assert.equal(t("stopPreview", "ko"), "정지");
  assert.equal(t("stopPreview", "en"), "Stop");
  assert.equal(t("sttTitle", "ko"), "mp3 → 텍스트");
  assert.equal(t("sttTitle", "en"), "MP3 → Text");
  assert.equal(t("chooseFile", "ko"), "파일 선택");
  assert.equal(t("chooseFile", "en"), "Choose File");
  assert.equal(t("noFileChosen", "ko"), "선택된 파일 없음");
  assert.equal(t("noFileChosen", "en"), "No file chosen");
  assert.equal(t("skipBeep", "ko"), "초반 비프음 스킵");
  assert.equal(t("skipBeep", "en"), "Skip intro beep");
});

test("i18n dynamic formatting functions work in both languages", () => {
  assert.equal(translations.ko.ttsConverting(2, 5), "3/5 문장 변환 중");
  assert.equal(translations.en.ttsConverting(2, 5), "Converting sentence 3/5");
  assert.equal(translations.ko.sttDone(4), "완료: 4개 턴. 틀린 부분은 직접 고칠 수 있어요.");
  assert.equal(translations.en.sttDone(4), "Completed: 4 turns. You can edit any mistakes directly.");
});

test("isBeepTone detects pure sine tones and rejects speech-like audio", () => {
  const r = 16000;
  const beep1k = tone(0.4, r, 1000);
  const beep800 = tone(0.3, r, 800);
  const voice = speechSim(0.8, r);

  assert.equal(isBeepTone(beep1k, r), true, "1000Hz pure tone should be detected as beep");
  assert.equal(isBeepTone(beep800, r), true, "800Hz pure tone should be detected as beep");
  assert.equal(isBeepTone(voice, r), false, "Voice simulation should not be detected as beep");
});

test("filterIntroBeep removes only early beep turns within first 3.5s", () => {
  const r = 16000;
  // Scenario: 0.2s silence + 0.4s beep(1kHz) + 1s silence + 2s voice + 1s silence + 0.4s beep(mid-call)
  const introBeep = tone(0.4, r, 1000);
  const voiceTurn = speechSim(2.0, r);
  const midBeep = tone(0.4, r, 1000);

  const fullAudio = cat(
    silence(0.2, r),
    introBeep,
    silence(1.0, r),
    voiceTurn,
    silence(1.0, r),
    midBeep
  );

  const turns = splitTurns(fullAudio, r);
  assert.equal(turns.length, 3, "Original audio should have 3 turns (intro beep, voice, mid beep)");

  const filtered = filterIntroBeep(turns, fullAudio, r);
  assert.equal(filtered.length, 2, "Intro beep should be filtered out, leaving 2 turns");
  assert.ok(filtered[0].start >= 1.5 * r, "First turn should now be the voice turn");
  assert.ok(filtered[1].start >= 4.5 * r, "Second turn should be the mid-call beep");
});

test("filterIntroBeep keeps all turns when first turn is speech", () => {
  const r = 16000;
  const voiceTurn = speechSim(2.0, r);
  const fullAudio = cat(silence(0.2, r), voiceTurn, silence(1.0, r), voiceTurn);
  const turns = splitTurns(fullAudio, r);
  assert.equal(turns.length, 2);

  const filtered = filterIntroBeep(turns, fullAudio, r);
  assert.equal(filtered.length, 2, "No turns should be removed if first turn is voice");
});
