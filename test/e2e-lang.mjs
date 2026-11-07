import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.argv[2] || "http://127.0.0.1:4173";
const browser = await chromium.launch();
const page = await browser.newPage();

try {
  // 1. index.html 검증
  await page.goto(base + "/index.html");
  const initDesc = await page.textContent("#desc");
  assert.ok(initDesc.includes("서버 없이"), "기본 언어는 한국어여야 합니다.");
  
  // 언어 버튼 클릭 (한국어 -> English)
  await page.click("#lang-btn");
  const enDesc = await page.textContent("#desc");
  assert.ok(enDesc.includes("Runs 100% on-device"), "언어 전환 후 영어로 바뀌어야 합니다.");
  assert.equal(await page.textContent("#lang-btn"), "🌐 한국어", "버튼 텍스트가 한국어로 바뀌어야 합니다.");

  // 2. tts.html 이동 시 언어 설정 유지(localStorage) 확인
  await page.goto(base + "/tts.html");
  assert.equal(await page.textContent("#title"), "Text → MP3", "localStorage의 언어 설정이 유지되어야 합니다.");
  assert.equal(await page.textContent("#go"), "Generate MP3", "버튼이 영어여야 합니다.");

  // 다시 한국어로 토글
  await page.click("#lang-btn");
  assert.equal(await page.textContent("#title"), "텍스트 → mp3", "한국어로 다시 전환되어야 합니다.");
  assert.equal(await page.textContent("#go"), "mp3 만들기", "버튼이 한국어여야 합니다.");

  // 3. stt.html 이동
  await page.goto(base + "/stt.html");
  assert.equal(await page.textContent("#title"), "mp3 → 텍스트");
  assert.equal(await page.textContent("#file-btn"), "파일 선택");
  assert.equal(await page.textContent("#file-name"), "선택된 파일 없음");

  // 영어로 전환
  await page.click("#lang-btn");
  assert.equal(await page.textContent("#title"), "MP3 → Text");
  assert.equal(await page.textContent("#file-btn"), "Choose File");
  assert.equal(await page.textContent("#file-name"), "No file chosen");

  console.log("✅ e2e-lang: ALL TESTS PASSED");
} finally {
  await browser.close();
}
