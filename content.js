// 먼작귀 엔딩 스킵 - content script
// 재생목록 안에서 영상의 "끝에서 N초" 지점에 도달하면 다음 영상으로 넘깁니다.
// 애니박스 먼작귀 회차는 모두 1:31 길이이고, 엔딩(크레딧+노래)은 약 1:01부터 시작합니다 → 끝에서 약 29초.

const DEFAULTS = {
  enabled: true,
  secondsFromEnd: 29,      // 끝에서 몇 초 남았을 때 넘길지
  maxDuration: 180,        // 이보다 긴 영상(예: 1시간 노래 영상)은 건드리지 않음
  onlyThisPlaylist: true,  // true면 먼작귀 영상(제목) 또는 아래 재생목록에서만 동작
  playlistId: "PLsmaUhkCwW3q5q46uc9So2b4D-pZqVZOV"
};
const TITLE_KEYWORDS = ["먼작귀", "ちいかわ", "chiikawa"];

let settings = { ...DEFAULTS };
let skippedFor = null; // 같은 영상에서 여러 번 넘기지 않도록

chrome.storage.sync.get(DEFAULTS, (s) => { settings = s; });
chrome.storage.onChanged.addListener((changes) => {
  for (const [k, { newValue }] of Object.entries(changes)) settings[k] = newValue;
});

console.log("[먼작귀 엔딩 스킵] 로드됨");

function currentVideoId() {
  return new URL(location.href).searchParams.get("v");
}

function currentListId() {
  return new URL(location.href).searchParams.get("list");
}

function isChiikawaVideo() {
  const t = document.title.toLowerCase();
  return TITLE_KEYWORDS.some((k) => t.includes(k));
}

function isAdPlaying() {
  return !!document.querySelector(".ad-showing, .ad-interrupting");
}

function fmt(sec) {
  sec = Math.max(0, Math.floor(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

// 지금 이 영상에서 스킵이 동작하는지, 아니면 왜 안 하는지
function status(video) {
  if (!settings.enabled) return { ok: false, msg: "꺼져 있음" };
  if (!currentListId()) return { ok: false, msg: "재생목록이 아님 (재생목록에서 열어주세요)" };
  if (settings.onlyThisPlaylist && currentListId() !== settings.playlistId && !isChiikawaVideo())
    return { ok: false, msg: "먼작귀 영상이 아님" };
  if (isAdPlaying()) return { ok: false, msg: "광고 중" };
  const d = video.duration;
  if (!isFinite(d) || d <= 0) return { ok: false, msg: "로딩 중" };
  if (d > settings.maxDuration) return { ok: false, msg: "긴 영상이라 건너뜀" };
  if (d <= settings.secondsFromEnd + 5) return { ok: false, msg: "영상이 너무 짧음" };
  return { ok: true, msg: `${fmt(d - settings.secondsFromEnd)}에 다음 화로` };
}

function goNext(video) {
  console.log("[먼작귀 엔딩 스킵] 다음 화로 이동", fmt(video.currentTime));
  const nextBtn = document.querySelector(".ytp-next-button");
  if (nextBtn && nextBtn.offsetParent !== null) {
    nextBtn.click();
  } else {
    // 다음 버튼이 없을 때: 영상 끝으로 이동해 재생목록 자동재생에 맡김
    video.currentTime = video.duration;
  }
}

function onTimeUpdate(e) {
  const video = e.target;
  const st = status(video);
  showBadge(st);
  if (!st.ok) return;

  const id = currentVideoId();
  if (skippedFor === id) return;

  if (video.duration - video.currentTime <= settings.secondsFromEnd) {
    skippedFor = id;
    goNext(video);
  }
}

// 플레이어 왼쪽 위에 작게 상태 표시 (동작 확인용)
function showBadge(st) {
  const player = document.querySelector("#movie_player");
  if (!player) return;
  let b = document.getElementById("chiikawa-skip-badge");
  if (!b) {
    b = document.createElement("div");
    b.id = "chiikawa-skip-badge";
    b.style.cssText =
      "position:absolute;top:8px;left:8px;z-index:60;padding:3px 8px;border-radius:10px;" +
      "font:12px/1.4 sans-serif;color:#fff;pointer-events:none;opacity:.85";
    player.appendChild(b);
  }
  b.style.background = st.ok ? "rgba(30,150,90,.85)" : "rgba(80,80,80,.85)";
  b.textContent = `엔딩 스킵: ${st.msg}`;
}

// YouTube는 페이지 이동 없이 video 요소를 재사용/교체하므로 주기적으로 붙여줌
function attach() {
  document.querySelectorAll("video").forEach((v) => {
    if (v.dataset.chiikawaSkip) return;
    v.dataset.chiikawaSkip = "1";
    v.addEventListener("timeupdate", onTimeUpdate);
  });
}

// 새 영상으로 바뀌면 다시 넘길 수 있게 초기화
let lastId = currentVideoId();
setInterval(() => {
  attach();
  const id = currentVideoId();
  if (id !== lastId) {
    lastId = id;
    if (skippedFor !== id) skippedFor = null;
  }
}, 1000);
attach();
