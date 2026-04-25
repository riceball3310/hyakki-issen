(() => {
  const BGM_CANDIDATES = [
    "assets/bgm_battle.mp3.mp3?v=4",
    "assets/bgm_battle.mp3?v=4"
  ];
  const STORAGE_KEY = "hyakki_issen_bgm_enabled";

  let audio = new Audio(BGM_CANDIDATES[0]);
  audio.loop = true;
  audio.volume = 0.42;
  audio.preload = "auto";

  let bgmEnabled = localStorage.getItem(STORAGE_KEY) !== "off";
  let unlocked = false;
  let currentCandidateIndex = 0;

  function saveSetting() {
    localStorage.setItem(STORAGE_KEY, bgmEnabled ? "on" : "off");
  }

  function setAudioSource(index) {
    currentCandidateIndex = index;
    const src = BGM_CANDIDATES[currentCandidateIndex];
    if (audio.src.includes(src.replace(/\?.*$/, ""))) return;

    const wasPlaying = !audio.paused;
    audio.pause();
    audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0.42;
    audio.preload = "auto";
    if (wasPlaying && bgmEnabled) playBattleBgm();
  }

  function tryNextSource() {
    if (currentCandidateIndex + 1 < BGM_CANDIDATES.length) {
      setAudioSource(currentCandidateIndex + 1);
      return true;
    }
    return false;
  }

  function updateAudioButton() {
    const btn = document.getElementById("audioUnlockBtn");
    if (!btn) return;

    btn.textContent = bgmEnabled
      ? (unlocked ? "BGM ON" : "音声ON")
      : "BGM OFF";
    btn.classList.toggle("is-on", bgmEnabled && unlocked);
    btn.classList.toggle("is-off", !bgmEnabled);
  }

  function playBattleBgm() {
    if (!bgmEnabled) return;
    audio.volume = 0.42;

    const promise = audio.play();
    if (promise && typeof promise.then === "function") {
      promise
        .then(() => {
          unlocked = true;
          updateAudioButton();
        })
        .catch(() => {
          if (tryNextSource()) {
            const retry = audio.play();
            if (retry && typeof retry.then === "function") {
              retry
                .then(() => {
                  unlocked = true;
                  updateAudioButton();
                })
                .catch(() => updateAudioButton());
            }
          } else {
            updateAudioButton();
          }
        });
    }
  }

  function stopBattleBgm() {
    audio.pause();
    audio.currentTime = 0;
    updateAudioButton();
  }

  function toggleBgm() {
    bgmEnabled = !bgmEnabled;
    saveSetting();
    if (bgmEnabled) playBattleBgm();
    else stopBattleBgm();
    updateToggleButton();
    updateAudioButton();
  }

  function unlockAudio() {
    bgmEnabled = true;
    saveSetting();
    playBattleBgm();
    updateToggleButton();
    updateAudioButton();
  }

  function updateToggleButton() {
    const btn = document.getElementById("bgmToggleBtn");
    if (!btn) return;
    btn.classList.toggle("active", bgmEnabled);
    btn.innerHTML = bgmEnabled
      ? `<span class="diffName">BGM：ON</span><span class="diffDesc">戦闘中に紫月百鬼夜行を再生</span>`
      : `<span class="diffName">BGM：OFF</span><span class="diffDesc">音を出さずにプレイ</span>`;
  }

  function addAudioUnlockButton() {
    if (document.getElementById("audioUnlockBtn")) return;
    const btn = document.createElement("button");
    btn.id = "audioUnlockBtn";
    btn.type = "button";
    btn.addEventListener("click", unlockAudio);
    btn.addEventListener("touchend", e => {
      e.preventDefault();
      unlockAudio();
    }, { passive: false });
    document.body.appendChild(btn);
    updateAudioButton();
  }

  function addBgmSettingButton() {
    const grid = document.querySelector("#settingsScreen .difficultyGrid");
    if (!grid || document.getElementById("bgmToggleBtn")) return;

    const btn = document.createElement("button");
    btn.id = "bgmToggleBtn";
    btn.className = "difficultyBtn";
    btn.type = "button";
    btn.addEventListener("click", toggleBgm);
    grid.appendChild(btn);
    updateToggleButton();
  }

  function bindBgmEvents() {
    const startBtn = document.getElementById("startBtn");
    const retryBtn = document.getElementById("retryBtn");
    const resultTitleBtn = document.getElementById("resultTitleBtn");
    const howtoBackBtn = document.getElementById("howtoBackBtn");
    const settingsBackBtn = document.getElementById("settingsBackBtn");

    startBtn?.addEventListener("pointerdown", unlockAudio);
    startBtn?.addEventListener("click", playBattleBgm);
    retryBtn?.addEventListener("pointerdown", unlockAudio);
    retryBtn?.addEventListener("click", playBattleBgm);

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
    addAudioUnlockButton();
    addBgmSettingButton();
    bindBgmEvents();
  });
})();
