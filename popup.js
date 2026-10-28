const DEFAULTS = {
  enabled: true,
  secondsFromEnd: 29,
  maxDuration: 180,
  onlyThisPlaylist: true,
  playlistId: "PLsmaUhkCwW3q5q46uc9So2b4D-pZqVZOV"
};

const $ = (id) => document.getElementById(id);

chrome.storage.sync.get(DEFAULTS, (s) => {
  $("enabled").checked = s.enabled;
  $("secondsFromEnd").value = s.secondsFromEnd;
  $("onlyThisPlaylist").checked = s.onlyThisPlaylist;
});

function save() {
  const sec = Math.max(1, Math.min(120, parseInt($("secondsFromEnd").value, 10) || DEFAULTS.secondsFromEnd));
  chrome.storage.sync.set({
    enabled: $("enabled").checked,
    secondsFromEnd: sec,
    onlyThisPlaylist: $("onlyThisPlaylist").checked
  }, () => {
    $("saved").textContent = "저장됨";
    setTimeout(() => ($("saved").textContent = ""), 1000);
  });
}

["enabled", "secondsFromEnd", "onlyThisPlaylist"].forEach((id) => $(id).addEventListener("change", save));
