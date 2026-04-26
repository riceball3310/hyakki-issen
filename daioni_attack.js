(() => {
  /*
    大鬼専用攻撃パッチ。
    既存の script.js を大きく書き換えず、後読み込みで update/draw を拡張する。

    仕様:
    - 小鬼/鬼火は今まで通り接触ダメージ
    - 大鬼は接触ダメージを無効化し、近距離で予備動作→振り下ろし→硬直を行う
    - 振り下ろし中だけ攻撃判定を出す
  */

  const ATTACK_RANGE = 92;
  const HIT_RANGE = 72;
  const WINDUP_TIME = 0.48;
  const STRIKE_TIME = 0.22;
  const RECOVERY_TIME = 0.58;
  const COOLDOWN_TIME = 1.25;
  const DAMAGE = 20;

  function ensureDaioniState(e) {
    if (e.type !== "daioni") return;
    if (!e.daioniAttack) {
      e.daioniAttack = {
        phase: "idle",
        timer: 0,
        cooldown: Math.random() * 0.8,
        hitDone: false,
        angle: 0,
        flash: 0
      };
    }
  }

  function setPhase(e, phase, timer) {
    ensureDaioniState(e);
    e.daioniAttack.phase = phase;
    e.daioniAttack.timer = timer;
    e.daioniAttack.hitDone = false;
  }

  function updateDaioniAttack(dt) {
    if (typeof enemies === "undefined" || typeof player === "undefined") return;
    if (typeof running !== "undefined" && !running) return;

    for (const e of enemies) {
      if (!e || e.dead || e.type !== "daioni") continue;
      ensureDaioniState(e);

      const atk = e.daioniAttack;
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      atk.angle = Math.atan2(dy, dx);

      if (atk.cooldown > 0) atk.cooldown -= dt;
      if (atk.flash > 0) atk.flash -= dt;

      if (atk.phase === "idle") {
        if (d < ATTACK_RANGE && atk.cooldown <= 0) {
          setPhase(e, "windup", WINDUP_TIME);
          e.vx *= 0.15;
          e.vy *= 0.15;
          if (typeof addText === "function") addText(e.x, e.y - 44, "！", false);
        }
        continue;
      }

      // 攻撃中はその場で踏ん張る。既存の追尾速度をかなり殺す。
      e.vx *= Math.pow(0.001, dt);
      e.vy *= Math.pow(0.001, dt);

      atk.timer -= dt;

      if (atk.phase === "windup") {
        // 予備動作中は少し震えさせるため、既存アニメ位相を速める。
        e.anim += dt * 10;
        if (atk.timer <= 0) {
          setPhase(e, "strike", STRIKE_TIME);
          atk.flash = 0.18;
          if (typeof shake !== "undefined") shake = Math.max(shake, 7);
        }
        continue;
      }

      if (atk.phase === "strike") {
        const hitAngle = Math.atan2(player.y - e.y, player.x - e.x);
        const angleDiff = Math.abs(Math.atan2(Math.sin(hitAngle - atk.angle), Math.cos(hitAngle - atk.angle)));
        const canHit = d < HIT_RANGE && angleDiff < Math.PI * 0.78;

        if (!atk.hitDone && canHit && player.inv <= 0 && (typeof ultimateActive === "undefined" || ultimateActive <= 0)) {
          atk.hitDone = true;
          player.hp = Math.max(0, player.hp - DAMAGE);
          player.inv = 0.55;
          if (typeof combo !== "undefined") combo = 0;
          if (typeof shake !== "undefined") shake = Math.max(shake, 13);
          if (typeof addParticles === "function") addParticles(player.x, player.y, 14, 0.9, true);
          if (typeof addText === "function") addText(player.x, player.y - 40, "痛撃", false);
          if (player.hp <= 0 && typeof gameOver === "function") gameOver();
        }

        if (atk.timer <= 0) {
          setPhase(e, "recovery", RECOVERY_TIME);
        }
        continue;
      }

      if (atk.phase === "recovery") {
        if (atk.timer <= 0) {
          atk.phase = "idle";
          atk.cooldown = COOLDOWN_TIME + Math.random() * 0.45;
        }
      }
    }
  }

  function drawDaioniAttackOverlay() {
    if (typeof ctx === "undefined" || typeof enemies === "undefined") return;

    ctx.save();
    for (const e of enemies) {
      if (!e || e.dead || e.type !== "daioni" || !e.daioniAttack) continue;
      const atk = e.daioniAttack;
      if (atk.phase === "idle") continue;

      const angle = atk.angle || 0;
      const x = e.x;
      const y = e.y;

      if (atk.phase === "windup") {
        const p = 1 - Math.max(0, atk.timer) / WINDUP_TIME;
        ctx.globalAlpha = 0.25 + p * 0.35;
        ctx.strokeStyle = "rgba(255, 92, 92, 0.95)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 40 + p * 25, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.22 + p * 0.30;
        ctx.fillStyle = "rgba(255, 48, 48, 0.22)";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, HIT_RANGE, angle - Math.PI * 0.42, angle + Math.PI * 0.42);
        ctx.closePath();
        ctx.fill();
      }

      if (atk.phase === "strike") {
        const p = 1 - Math.max(0, atk.timer) / STRIKE_TIME;
        ctx.globalAlpha = 0.78;
        ctx.strokeStyle = "rgba(255, 220, 180, 0.95)";
        ctx.lineWidth = 8;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(x, y, 54 + p * 12, angle - Math.PI * 0.55, angle + Math.PI * 0.35);
        ctx.stroke();

        ctx.globalAlpha = 0.34;
        ctx.fillStyle = "rgba(255, 80, 60, 0.45)";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, HIT_RANGE, angle - Math.PI * 0.50, angle + Math.PI * 0.50);
        ctx.closePath();
        ctx.fill();
      }

      if (atk.phase === "recovery") {
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 44, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function installDaioniPatch() {
    if (typeof update !== "function" || typeof draw !== "function") {
      setTimeout(installDaioniPatch, 50);
      return;
    }

    const originalUpdate = update;
    update = function patchedUpdate(dt) {
      // 既存の接触ダメージを大鬼だけ無効化するため、update中だけ当たり半径を0にする。
      const restored = [];
      if (typeof enemies !== "undefined") {
        for (const e of enemies) {
          if (e && e.type === "daioni") {
            ensureDaioniState(e);
            restored.push([e, e.r, e.damage]);
            e.r = 0;
            e.damage = 0;
          }
        }
      }

      originalUpdate(dt);

      for (const [e, r, damage] of restored) {
        if (e && !e.dead) {
          e.r = r;
          e.damage = damage;
        }
      }

      updateDaioniAttack(dt);
    };

    const originalDraw = draw;
    draw = function patchedDraw() {
      originalDraw();
      drawDaioniAttackOverlay();
    };
  }

  installDaioniPatch();
})();
