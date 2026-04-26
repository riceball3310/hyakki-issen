(() => {
  /*
    大鬼専用攻撃パッチ v2。
    既存の draw/update 関数名に依存せず、独立した requestAnimationFrame で動かす。

    仕様:
    - 大鬼が近距離に入ると予備動作→振り下ろし→硬直
    - 攻撃中は移動速度を落として踏ん張る
    - 予備動作・攻撃範囲・振り下ろしエフェクトを canvas に重ね描き
  */

  const ATTACK_RANGE = 130;
  const HIT_RANGE = 92;
  const WINDUP_TIME = 0.58;
  const STRIKE_TIME = 0.26;
  const RECOVERY_TIME = 0.62;
  const COOLDOWN_TIME = 1.05;
  const DAMAGE = 18;

  let last = performance.now();

  function canAccessGame() {
    try {
      return typeof ctx !== "undefined" && typeof enemies !== "undefined" && typeof player !== "undefined";
    } catch (_) {
      return false;
    }
  }

  function ensureState(e) {
    if (!e || e.type !== "daioni") return;
    if (!e.daioniAttack) {
      e.daioniAttack = {
        phase: "idle",
        timer: 0,
        cooldown: Math.random() * 0.9,
        hitDone: false,
        angle: 0,
        originalSpeed: e.speed || 45,
        wobble: Math.random() * Math.PI * 2
      };
    }
  }

  function setPhase(e, phase, timer) {
    ensureState(e);
    e.daioniAttack.phase = phase;
    e.daioniAttack.timer = timer;
    e.daioniAttack.hitDone = false;
  }

  function damagePlayer(e) {
    if (typeof player === "undefined") return;
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
  }

  function updateDaioni(dt) {
    if (!canAccessGame()) return;
    if (typeof running !== "undefined" && !running) return;

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
          e.vx *= 0.08;
          e.vy *= 0.08;
          try { addText(e.x, e.y - 52, "！", false); } catch (_) {}
        }
        continue;
      }

      // 攻撃中は踏ん張らせる。これで見た目にも「攻撃している」感が出る。
      e.speed = 0;
      e.vx *= Math.pow(0.001, dt);
      e.vy *= Math.pow(0.001, dt);
      e.anim += dt * 14;
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

        if (!atk.hitDone && d < HIT_RANGE && angleDiff < Math.PI * 0.70) {
          atk.hitDone = true;
          damagePlayer(e);
        }

        if (atk.timer <= 0) {
          setPhase(e, "recovery", RECOVERY_TIME);
        }
        continue;
      }

      if (atk.phase === "recovery") {
        if (atk.timer <= 0) {
          atk.phase = "idle";
          atk.cooldown = COOLDOWN_TIME + Math.random() * 0.5;
          e.speed = atk.originalSpeed;
        }
      }
    }
  }

  function drawDaioniOverlay() {
    if (!canAccessGame()) return;
    if (typeof running !== "undefined" && !running) return;

    ctx.save();

    for (const e of enemies) {
      if (!e || e.dead || e.type !== "daioni" || !e.daioniAttack) continue;
      const atk = e.daioniAttack;
      if (atk.phase === "idle") continue;

      const x = e.x;
      const y = e.y;
      const angle = atk.angle || 0;

      if (atk.phase === "windup") {
        const p = 1 - Math.max(0, atk.timer) / WINDUP_TIME;
        const pulse = 1 + Math.sin(performance.now() * 0.035) * 0.04;

        ctx.globalAlpha = 0.28 + p * 0.45;
        ctx.strokeStyle = "rgba(255, 74, 74, 0.95)";
        ctx.lineWidth = 2 + p * 2;
        ctx.beginPath();
        ctx.arc(x, y, (42 + p * 25) * pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.20 + p * 0.28;
        ctx.fillStyle = "rgba(255, 44, 44, 0.36)";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, HIT_RANGE, angle - Math.PI * 0.45, angle + Math.PI * 0.45);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 0.95;
        ctx.fillStyle = "rgba(255, 235, 210, 0.95)";
        ctx.font = "900 24px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("！", x, y - 58 - p * 8);
      }

      if (atk.phase === "strike") {
        const p = 1 - Math.max(0, atk.timer) / STRIKE_TIME;

        ctx.globalAlpha = 0.86;
        ctx.strokeStyle = "rgba(255, 230, 190, 0.98)";
        ctx.lineWidth = 10;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(x, y, 58 + p * 18, angle - Math.PI * 0.58, angle + Math.PI * 0.38);
        ctx.stroke();

        ctx.globalAlpha = 0.32;
        ctx.fillStyle = "rgba(255, 70, 50, 0.52)";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, HIT_RANGE, angle - Math.PI * 0.50, angle + Math.PI * 0.50);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 0.38;
        ctx.strokeStyle = "rgba(255, 70, 70, 0.85)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * HIT_RANGE, y + Math.sin(angle) * HIT_RANGE);
        ctx.stroke();
      }

      if (atk.phase === "recovery") {
        ctx.globalAlpha = 0.16;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 42, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;

    updateDaioni(dt);
    drawDaioniOverlay();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
