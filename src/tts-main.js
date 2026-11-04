const $ = (id) => document.getElementById(id);
const voices = { af_heart: "여성 (미국) Heart", af_bella: "여성 (미국) Bella", am_michael: "남성 (미국) Michael", bf_emma: "여성 (영국) Emma", bm_george: "남성 (영국) George" };
for (const [k, v] of Object.entries(voices)) $("voice").add(new Option(v, k));
$("speed").oninput = () => ($("speedv").textContent = (+$("speed").value).toFixed(1) + "x");

const worker = new Worker(new URL("./tts-worker.js", import.meta.url), { type: "module" });
let url;
worker.onmessage = ({ data: m }) => {
  if (m.type === "status") $("status").textContent = m.msg;
  else if (m.type === "dl") { $("bar").hidden = false; $("bar").max = 100; $("bar").value = m.pct; $("status").textContent = `모델 다운로드 ${Math.round(m.pct)}%`; }
  else if (m.type === "progress") { $("bar").hidden = false; $("bar").max = m.total; $("bar").value = m.done; $("status").textContent = `${m.done + 1}/${m.total} 문장 변환 중`; }
  else if (m.type === "done") {
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(m.blob);
    $("player").src = url; $("player").hidden = false;
    const name = ($("text").value.trim().split(/\s+/).slice(0, 4).join("_").replace(/[^\w]/g, "") || "audio") + ".mp3";
    $("dl").href = url; $("dl").download = name; $("dl").hidden = false;
    $("bar").hidden = true; $("go").disabled = false;
    $("status").textContent = `완료: ${m.seconds.toFixed(1)}초 분량, ${(m.blob.size / 1024).toFixed(0)}KB`;
  } else if (m.type === "error") { $("status").textContent = "오류: " + m.msg; $("bar").hidden = true; $("go").disabled = false; }
};
$("go").onclick = () => {
  $("go").disabled = true; $("dl").hidden = true; $("player").hidden = true;
  worker.postMessage({ text: $("text").value, voice: $("voice").value, speed: +$("speed").value });
};
