(() => {
  /*
    大鬼専用攻撃パッチ v4。
    大鬼の移動を止めず、予兆と攻撃エフェクトだけを自然に重ねる版。
  */

  const ATTACK_RANGE = 126;
  const HIT_RANGE = 82;
  const WINDUP_TIME = 0.46;
  const STRIKE_TIME = 0.18;
  const RECOVERY_TIME = 0.42;
  const COOLDOWN_TIME = 1.85;
  const DAMAGE = 14;

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
        cooldown: 0.8 + Math.random() * 1.2,
        hitDone: false,
        angle: 0
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
      player.inv = 0.50;
      try { combo = 0; } catch (_) {}
      try { shake = Math.max(shake, 10); } catch (_) {}
      try { addParticles(player.x, player.y, 10, 0.75, true); } catch (_) {}
      try { addText(player.x, player.y - 38, "痛撃", false); } catch (_) {}
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
        if (d < ATTACK_RANGE && atk.cooldown <= 0) {
          setPhase(e, "windup", WINDUP_TIME);
          try { addText(e.x, e.y - 48, "！", false); } catch (_) {}
        }
        continue;
      }

      // 移動は止めない。少しだけ重くする程度。
      e.vx *= Math.pow(0.35, dt);
      e.vy *= Math.pow(0.35, dt);
      e.anim += dt * 8;
      atk.timer -= dt;

      if (atk.phase === "windup") {
        if (atk.timer <= 0) {
          setPhase(e, "strike", STRIKE_TIME);
          try { shake = Math.max(shake, 6); } catch (_) {}
        }
        continue;
      }

      if (atk.phase === "strike") {
        const hitAngle = Math.atan2(player.y - e.y, player.x - e.x);
        const angleDiff = Math.abs(Math.atan2(Math.sin(hitAngle - atk.angle), Math.cos(hitAngle - atk.angle)));
        if (!atk.hitDone && d < HIT_RANGE && angleDiff < Math.PI * 0.72) {
          atk.hitDone = true;
          damagePlayer();
        }
        if (atk.timer <= 0) setPhase(e, "recovery", RECOVERY_TIME);
        continue;
      }

      if (atk.phase === "recovery") {
        if (atk.timer <= 0) {
          atk.phase = "idle";
          atk.cooldown = COOLDOWN_TIME + Math.random() * 0.8;
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
      if (!e || e.dead || e.type !== "daioni" || !e.daioniAttack) continue;
      const atk = e.daioniAttack;
      if (atk.phase === "idle") continue;

      const x = e.x;
      const y = e.y;
      const angle = atk.angle || Math.atan2(player.y - y, player.x - x);

      if (atk.phase === "windup") {
        const p = 1 - Math.max(0, atk.timer) / WINDUP_TIME;
        const pulse = 1 + Math.sin(now * 0.03) * 0.04;

        fx.save();
        fx.globalAlpha = 0.22 + p * 0.42;
        fx.strokeStyle = "rgba(255, 54, 54, 0.95)";
        fx.lineWidth = 2 + p * 2;
        fx.beginPath();
        fx.arc(x, y, (30 + p * 26) * pulse, 0, Math.PI * 2);
        fx.stroke();

        fx.globalAlpha = 0.14 + p * 0.22;
        fx.fillStyle = "rgba(255, 42, 42, 0.40)";
        fx.beginPath();
        fx.moveTo(x, y);
        fx.arc(x, y, HIT_RANGE, angle - Math.PI * 0.42, angle + Math.PI * 0.42);
        fx.closePath();
        fx.fill();

        fx.globalAlpha = 0.9;
        fx.fillStyle = "rgba(255, 240, 210, 0.95)";
        fx.font = "900 22px system-ui, sans-serif";
        fx.textAlign = "center";
        fx.fillText("！", x, y - 52 - p * 8);
        fx.restore();
      }

      if (atk.phase === "strike") {
        const p = 1 - Math.max(0, atk.timer) / STRIKE_TIME;
        fx.save();
        fx.globalAlpha = 0.72;
        fx.strokeStyle = "rgba(255, 230, 190, 0.92)";
        fx.lineWidth = 8;
        fx.lineCap = "round";
        fx.beginPath();
        fx.arc(x, y, 46 + p * 18, angle - Math.PI * 0.55, angle + Math.PI * 0.38);
        fx.stroke();

        fx.globalAlpha = 0.26;
        fx.fillStyle = "rgba(255, 64, 48, 0.52)";
        fx.beginPath();
        fx.moveTo(x, y);
        fx.arc(x, y, HIT_RANGE, angle - Math.PI * 0.48, angle + Math.PI * 0.48);
        fx.closePath();
        fx.fill();
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
