(() => {
  const BGM_SRC = "assets/bgm_battle.mp3.mp3";
  const STORAGE_KEY = "hyakki_issen_bgm_enabled";

  const audio = new Audio(BGM_SRC);
  audio.loop = true;
  audio.volume = 0.38;
  audio.preload = "auto";

  let bgmEnabled = localStorage.getItem(STORAGE_KEY) !== "off";

  function saveSetting() {
    localStorage.setItem(STORAGE_KEY, bgmEnabled ? "on" : "off");
  }

  function playBattleBgm() {
    if (!bgmEnabled) return;
    audio.volume = 0.38;
    const promise = audio.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => {
        // iPhone / Android のブラウザでは、ユーザー操作の直後以外は再生が止められることがある。
        // その場合は次のタップ操作で再試行する。
      });
    }
  }

  function stopBattleBgm() {
    audio.pause();
    audio.currentTime = 0;
  }

  function updateToggleButton() {
    const btn = document.getElementById("bgmToggleBtn");
    if (!btn) return;
    btn.classList.toggle("active", bgmEnabled);
    btn.innerHTML = bgmEnabled
      ? `<span class="diffName">BGM：ON</span><span class="diffDesc">戦闘中に紫月百鬼夜行を再生</span>`
      : `<span class="diffName">BGM：OFF</span><span class="diffDesc">音を出さずにプレイ</span>`;
  }

  function addBgmSettingButton() {
    const grid = document.querySelector("#settingsScreen .difficultyGrid");
    if (!grid || document.getElementById("bgmToggleBtn")) return;

    const btn = document.createElement("button");
    btn.id = "bgmToggleBtn";
    btn.className = "difficultyBtn";
    btn.type = "button";
    btn.addEventListener("click", () => {
      bgmEnabled = !bgmEnabled;
      saveSetting();
      updateToggleButton();
      if (!bgmEnabled) stopBattleBgm();
    });
    grid.appendChild(btn);
    updateToggleButton();
  }

  function bindBgmEvents() {
    const startBtn = document.getElementById("startBtn");
    const retryBtn = document.getElementById("retryBtn");
    const resultTitleBtn = document.getElementById("resultTitleBtn");
    const howtoBackBtn = document.getElementById("howtoBackBtn");
    const settingsBackBtn = document.getElementById("settingsBackBtn");

    startBtn?.addEventListener("click", playBattleBgm);
    startBtn?.addEventListener("touchstart", playBattleBgm, { passive: true });
    retryBtn?.addEventListener("click", playBattleBgm);
    retryBtn?.addEventListener("touchstart", playBattleBgm, { passive: true });

    resultTitleBtn?.addEventListener("click", stopBattleBgm);
    howtoBackBtn?.addEventListener("click", stopBattleBgm);
    settingsBackBtn?.addEventListener("click", stopBattleBgm);

    const resultScreen = document.getElementById("resultScreen");
    if (resultScreen) {
      const observer = new MutationObserver(() => {
        if (!resultScreen.classList.contains("hidden")) stopBattleBgm();
      });
      observer.observe(resultScreen, { attributes: true, attributeFilter: ["class"] });
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    addBgmSettingButton();
    bindBgmEvents();
  });
})();
