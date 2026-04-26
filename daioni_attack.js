(() => {
  /*
    大鬼専用攻撃パッチ v3。
    ゲーム本体canvasとは別の透明canvasを重ね、攻撃予兆を確実に見えるようにする。
  */

  const ATTACK_RANGE = 210;
  const HIT_RANGE = 108;
  const WINDUP_TIME = 0.62;
  const STRIKE_TIME = 0.30;
  const RECOVERY_TIME = 0.60;
  const COOLDOWN_TIME = 0.95;
  const DAMAGE = 18;

  let last = performance.now();
  let fxCanvas = null;
  let fx = null;
  let fxDpr = 1;

  function setupFxCanvas() {
    if (fxCanvas) return;
    fxCanvas = document.createElement("canvas");
    fxCanvas.id = "daioniAttackFx";
    fxCanvas.style.position = "fixed";
    fxCanvas.style.inset = "0";
    fxCanvas.style.width = "100vw";
    fxCanvas.style.height = "100vh";
    fxCanvas.style.pointerEvents = "none";
    fxCanvas.style.zIndex = "6";
    fxCanvas.style.mixBlendMode = "screen";
    document.body.appendChild(fxCanvas);
    fx = fxCanvas.getContext("2d");
    resizeFxCanvas();
    window.addEventListener("resize", resizeFxCanvas);
  }

  function resizeFxCanvas() {
    if (!fxCanvas || !fx) return;
    fxDpr = Math.min(window.devicePixelRatio || 1, 2);
    fxCanvas.width = Math.floor(window.innerWidth * fxDpr);
    fxCanvas.height = Math.floor(window.innerHeight * fxDpr);
    fx.setTransform(fxDpr, 0, 0, fxDpr, 0, 0);
    fx.imageSmoothingEnabled = false;
  }

  function canAccessGame() {
    try {
      return typeof enemies !== "undefined" && typeof player !== "undefined";
    } catch (_) {
      return false;
    }
  }

  function isGameRunning() {
    try {
      return typeof running === "undefined" || running;
    } catch (_) {
      return true;
    }
  }

  function ensureState(e) {
    if (!e || e.type !== "daioni") return;
    if (!e.daioniAttack) {
      e.daioniAttack = {
        phase: "idle",
        timer: 0,
        cooldown: Math.random() * 0.45,
        hitDone: false,
        angle: 0,
        originalSpeed: e.speed || 45
      };
    }
  }

  function setPhase(e, phase, timer) {
    ensureState(e);
    e.daioniAttack.phase = phase;
    e.daioniAttack.timer = timer;
    e.daioniAttack.hitDone = false;
  }

  function damagePlayer() {
    try {
      if (player.inv > 0) return;
      if (typeof ultimateActive !== "undefined" && ultimateActive > 0) return;
      player.hp = Math.max(0, player.hp - DAMAGE);
      player.inv = 0.55;
      try { combo = 0; } catch (_) {}
      try { shake = Math.max(shake, 14); } catch (_) {}
      try { addParticles(player.x, player.y, 15, 0.9, true); } catch (_) {}
      try { addText(player.x, player.y - 42, "痛撃", false); } catch (_) {}
      if (player.hp <= 0) {
        player.hp = 0;
        try { gameOver(); } catch (_) {}
      }
    } catch (_) {}
  }

  function updateDaioni(dt) {
    if (!canAccessGame() || !isGameRunning()) return;

    for (const e of enemies) {
      if (!e || e.dead || e.type !== "daioni") continue;
      ensureState(e);
      const atk = e.daioniAttack;

      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      atk.angle = Math.atan2(dy, dx);

      if (atk.cooldown > 0) atk.cooldown -= dt;

      if (atk.phase === "idle") {
        e.speed = atk.originalSpeed;
        if (d < ATTACK_RANGE && atk.cooldown <= 0) {
          setPhase(e, "windup", WINDUP_TIME);
          e.vx *= 0.05;
          e.vy *= 0.05;
          try { addText(e.x, e.y - 52, "！", false); } catch (_) {}
        }
        continue;
      }

      // 攻撃中は移動を止めて、見た目に分かるようにする。
      e.speed = 0;
      e.vx *= Math.pow(0.0001, dt);
      e.vy *= Math.pow(0.0001, dt);
      e.anim += dt * 18;
      atk.timer -= dt;

      if (atk.phase === "windup") {
        if (atk.timer <= 0) {
          setPhase(e, "strike", STRIKE_TIME);
          try { shake = Math.max(shake, 8); } catch (_) {}
        }
        continue;
      }

      if (atk.phase === "strike") {
        const hitAngle = Math.atan2(player.y - e.y, player.x - e.x);
        const angleDiff = Math.abs(Math.atan2(Math.sin(hitAngle - atk.angle), Math.cos(hitAngle - atk.angle)));
        if (!atk.hitDone && d < HIT_RANGE && angleDiff < Math.PI * 0.75) {
          atk.hitDone = true;
          damagePlayer();
        }
        if (atk.timer <= 0) setPhase(e, "recovery", RECOVERY_TIME);
        continue;
      }

      if (atk.phase === "recovery") {
        if (atk.timer <= 0) {
          atk.phase = "idle";
          atk.cooldown = COOLDOWN_TIME + Math.random() * 0.45;
          e.speed = atk.originalSpeed;
        }
      }
    }
  }

  function drawDaioniOverlay() {
    if (!fx) return;
    fx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (!canAccessGame() || !isGameRunning()) return;

    const now = performance.now();

    for (const e of enemies) {
      if (!e || e.dead || e.type !== "daioni") continue;
      ensureState(e);
      const atk = e.daioniAttack;
      const x = e.x;
      const y = e.y;
      const angle = atk.angle || Math.atan2(player.y - y, player.x - x);

      // 大鬼を見分けやすくする常時リング。動作確認にもなる。
      fx.save();
      fx.globalAlpha = 0.28;
      fx.strokeStyle = "rgba(255, 60, 60, 0.95)";
      fx.lineWidth = 2;
      fx.beginPath();
      fx.arc(x, y, 28 + Math.sin(now * 0.008) * 2, 0, Math.PI * 2);
      fx.stroke();
      fx.restore();

      if (atk.phase === "idle") continue;

      if (atk.phase === "windup") {
        const p = 1 - Math.max(0, atk.timer) / WINDUP_TIME;
        const pulse = 1 + Math.sin(now * 0.03) * 0.05;

        fx.save();
        fx.globalAlpha = 0.38 + p * 0.45;
        fx.strokeStyle = "rgba(255, 40, 40, 1)";
        fx.lineWidth = 3 + p * 3;
        fx.beginPath();
        fx.arc(x, y, (44 + p * 34) * pulse, 0, Math.PI * 2);
        fx.stroke();

        fx.globalAlpha = 0.20 + p * 0.30;
        fx.fillStyle = "rgba(255, 36, 36, 0.48)";
        fx.beginPath();
        fx.moveTo(x, y);
        fx.arc(x, y, HIT_RANGE, angle - Math.PI * 0.48, angle + Math.PI * 0.48);
        fx.closePath();
        fx.fill();

        fx.globalAlpha = 1;
        fx.fillStyle = "rgba(255, 245, 210, 1)";
        fx.font = "900 28px system-ui, sans-serif";
        fx.textAlign = "center";
        fx.fillText("！", x, y - 62 - p * 10);
        fx.restore();
      }

      if (atk.phase === "strike") {
        const p = 1 - Math.max(0, atk.timer) / STRIKE_TIME;
        fx.save();
        fx.globalAlpha = 0.95;
        fx.strokeStyle = "rgba(255, 235, 190, 1)";
        fx.lineWidth = 12;
        fx.lineCap = "round";
        fx.beginPath();
        fx.arc(x, y, 60 + p * 22, angle - Math.PI * 0.60, angle + Math.PI * 0.42);
        fx.stroke();

        fx.globalAlpha = 0.42;
        fx.fillStyle = "rgba(255, 58, 42, 0.66)";
        fx.beginPath();
        fx.moveTo(x, y);
        fx.arc(x, y, HIT_RANGE, angle - Math.PI * 0.52, angle + Math.PI * 0.52);
        fx.closePath();
        fx.fill();
        fx.restore();
      }

      if (atk.phase === "recovery") {
        fx.save();
        fx.globalAlpha = 0.18;
        fx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        fx.lineWidth = 2;
        fx.beginPath();
        fx.arc(x, y, 44, 0, Math.PI * 2);
        fx.stroke();
        fx.restore();
      }
    }
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    setupFxCanvas();
    updateDaioni(dt);
    drawDaioniOverlay();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
