import test from "node:test";
import assert from "node:assert/strict";
import { resample, splitTurns, labelTurns, invertLabels, floatToInt16 } from "../src/pcm.js";
import { serialize, parse, fmtTime } from "../src/transcript.js";

const tone = (sec, rate, amp = 0.5) => Float32Array.from({ length: sec * rate }, (_, i) => amp * Math.sin(i / 10));
const silence = (sec, rate) => new Float32Array(sec * rate);
const cat = (...a) => { const o = new Float32Array(a.reduce((s, x) => s + x.length, 0)); let p = 0; for (const x of a) { o.set(x, p); p += x.length; } return o; };

test("resample 48k->16k yields a third of the samples", () => {
  assert.equal(resample(tone(1, 48000), 48000, 16000).length, 16000);
});
test("resample same rate returns same data", () => {
  const x = tone(1, 16000); assert.deepEqual(resample(x, 16000, 16000), x);
});
test("splitTurns finds two turns separated by a long pause", () => {
  const r = 16000, x = cat(tone(2, r), silence(1, r), tone(2, r));
  const t = splitTurns(x, r);
  assert.equal(t.length, 2);
  assert.ok(t[0].start < 0.1 * r && Math.abs(t[0].end - 2 * r) < 0.2 * r);
  assert.ok(Math.abs(t[1].start - 3 * r) < 0.2 * r);
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
