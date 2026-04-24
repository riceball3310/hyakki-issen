const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const stats = document.getElementById("stats");
const titleScreen = document.getElementById("titleScreen");
const howtoScreen = document.getElementById("howtoScreen");
const settingsScreen = document.getElementById("settingsScreen");
const resultScreen = document.getElementById("resultScreen");
const resultScore = document.getElementById("resultScore");
const resultCombo = document.getElementById("resultCombo");
const resultDifficulty = document.getElementById("resultDifficulty");

const startBtn = document.getElementById("startBtn");
const howtoBtn = document.getElementById("howtoBtn");
const settingsBtn = document.getElementById("settingsBtn");
const howtoBackBtn = document.getElementById("howtoBackBtn");
const settingsBackBtn = document.getElementById("settingsBackBtn");
const retryBtn = document.getElementById("retryBtn");
const resultTitleBtn = document.getElementById("resultTitleBtn");
const difficultyBtns = [...document.querySelectorAll(".difficultyBtn")];

const attackBtn = document.getElementById("attackBtn");
const ultimateBtn = document.getElementById("ultimateBtn");
const stickBase = document.getElementById("stickBase");
const stick = document.getElementById("stick");
const cutinLayer = document.getElementById("cutinLayer");

const moonSlashImage = new Image();
moonSlashImage.src = "assets/moon_slash.png";

const yuyuWalkImage = new Image();
yuyuWalkImage.src = "assets/yuyu_walk4.png";

const yuyuAttackImage = new Image();
yuyuAttackImage.src = "assets/yuyu_attack3.png";

const oniWalkImage = new Image();
oniWalkImage.src = "assets/oni_walk4.png";

const onibiWalkImage = new Image();
onibiWalkImage.src = "assets/onibi_walk4.png";

const daioniWalkImage = new Image();
daioniWalkImage.src = "assets/daioni_walk4.png";

let W = 0;
let H = 0;
let DPR = 1;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

window.addEventListener("resize", resize);
resize();

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let running = false;
let score = 0;
let combo = 0;
let bestCombo = 0;
let comboTimer = 0;
let spawnTimer = 0;
let slashCooldown = 0;
let attackFlash = 0;
let shake = 0;
let slow = 0;
let time = 0;
let ultimateGauge = 0;
let ultimateActive = 0;
let ultimateWave = null;
let walkAnim = 0;
let attackAnim = 0;
let attackTrailTimer = 0;
let afterimages = [];
const ATTACK_ANIM_MAX = 0.19;

const player = {
  name: "ユユ",
  x: W / 2,
  y: H / 2,
  r: 18,
  hp: 100,
  maxHp: 100,
  speed: 260,
  dirX: 1,
  dirY: 0,
  inv: 0,
  facing: "front",
  moving: false
};

let enemies = [];
let particles = [];
let texts = [];
let slashes = [];

const power = {
  range: 155,
  cooldown: 0.45,
  knockback: 300
};

const difficultyProfiles = {
  easy: { label: "やさしい", intervalMul: 1.35, extraMul: 0.55 },
  normal: { label: "ふつう", intervalMul: 1.0, extraMul: 1.0 },
  hard: { label: "むずかしい", intervalMul: 0.82, extraMul: 1.28 },
  chaos: { label: "百鬼", intervalMul: 0.64, extraMul: 1.70 }
};

const gameSettings = {
  difficulty: "easy"
};

function currentDifficulty() {
  return difficultyProfiles[gameSettings.difficulty] || difficultyProfiles.easy;
}

function applyDifficultyUI() {
  for (const btn of difficultyBtns) {
    btn.classList.toggle("active", btn.dataset.difficulty === gameSettings.difficulty);
  }
}

function hideAllMenus() {
  titleScreen.classList.add("hidden");
  howtoScreen.classList.add("hidden");
  settingsScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
}

function showTitleScreen() {
  running = false;
  hideAllMenus();
  titleScreen.classList.remove("hidden");
}

function showHowtoScreen() {
  running = false;
  hideAllMenus();
  howtoScreen.classList.remove("hidden");
}

function showSettingsScreen() {
  running = false;
  hideAllMenus();
  settingsScreen.classList.remove("hidden");
}

const joy = {
  active: false,
  id: null,
  dx: 0,
  dy: 0,
  cx: 0,
  cy: 0
};

/*
  yuyu_walk4.png は 4列×4段の歩行スプライトとして扱う。
  row 0: 正面歩き4コマ
  row 1: 背面歩き4コマ
  row 2: 横歩き4コマ
  row 3: 横歩き4コマ
  左向きは横歩きをそのまま、右向きは反転して使う。
*/

function startGame() {
  running = true;
  score = 0;
  combo = 0;
  bestCombo = 0;
  comboTimer = 0;
  spawnTimer = 0;
  slashCooldown = 0;
  attackFlash = 0;
  shake = 0;
  slow = 0;
  time = 0;
  ultimateGauge = 0;
  ultimateActive = 0;
  ultimateWave = null;
  walkAnim = 0;
  attackAnim = 0;
  attackTrailTimer = 0;
  afterimages = [];

  player.x = W / 2;
  player.y = H / 2;
  player.hp = player.maxHp;
  player.dirX = 1;
  player.dirY = 0;
  player.facing = "front";
  player.inv = 0;
  player.moving = false;

  power.range = 155;
  power.cooldown = 0.45;
  power.knockback = 300;

  enemies = [];
  particles = [];
  texts = [];
  slashes = [];

  hideAllMenus();
  cutinLayer.classList.remove("show");
  ultimateBtn.classList.remove("ready");
}

function gameOver() {
  running = false;
  hideAllMenus();
  resultScreen.classList.remove("hidden");
  resultScore.textContent = score;
  resultCombo.textContent = bestCombo;
  resultDifficulty.textContent = currentDifficulty().label;
}

startBtn.addEventListener("click", startGame);
startBtn.addEventListener("touchstart", e => {
  e.preventDefault();
  startGame();
});

howtoBtn.addEventListener("click", showHowtoScreen);
settingsBtn.addEventListener("click", showSettingsScreen);
howtoBackBtn.addEventListener("click", showTitleScreen);
settingsBackBtn.addEventListener("click", showTitleScreen);
retryBtn.addEventListener("click", startGame);
resultTitleBtn.addEventListener("click", showTitleScreen);

for (const btn of difficultyBtns) {
  btn.addEventListener("click", () => {
    gameSettings.difficulty = btn.dataset.difficulty;
    applyDifficultyUI();
  });
}
applyDifficultyUI();
showTitleScreen();

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  const m = 40;

  if (side === 0) {
    x = rand(-m, W + m);
    y = -m;
  } else if (side === 1) {
    x = W + m;
    y = rand(-m, H + m);
  } else if (side === 2) {
    x = rand(-m, W + m);
    y = H + m;
  } else {
    x = -m;
    y = rand(-m, H + m);
  }

  const difficulty = Math.min(time / 60, 1);
  const roll = Math.random();

  if (roll < 0.10) {
    enemies.push({
      type: "daioni",
      x,
      y,
      vx: 0,
      vy: 0,
      r: rand(18, 23),
      speed: rand(34, 52) + difficulty * 20,
      dead: false,
      anim: rand(0, 4),
      animOffset: rand(0, 4),
      hp: 3,
      maxHp: 3,
      damage: 18,
      scoreValue: 45
    });
  } else if (roll < 0.34) {
    enemies.push({
      type: "onibi",
      x,
      y,
      vx: 0,
      vy: 0,
      r: rand(9, 12),
      speed: rand(95, 145) + difficulty * 70,
      dead: false,
      anim: rand(0, 4),
      animOffset: rand(0, 4),
      hp: 1,
      maxHp: 1,
      damage: 10,
      scoreValue: 14
    });
  } else {
    enemies.push({
      type: "oni",
      x,
      y,
      vx: 0,
      vy: 0,
      r: rand(11, 15),
      speed: rand(55, 90) + difficulty * 50,
      dead: false,
      anim: rand(0, 4),
      animOffset: rand(0, 4),
      hp: 1,
      maxHp: 1,
      damage: 10,
      scoreValue: 10
    });
  }
}

function addParticles(x, y, count, scale = 1, violet = false) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(100, 440) * scale;

    particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rand(0.18, 0.55),
      maxLife: rand(0.18, 0.55),
      size: rand(2, 6) * scale,
      violet
    });
  }
}

function addText(x, y, text, big = false) {
  texts.push({
    x,
    y,
    text,
    life: big ? 0.85 : 0.55,
    maxLife: big ? 0.85 : 0.55,
    vy: big ? -75 : -48,
    size: big ? 28 : 17
  });
}

function slash() {
  if (!running || slashCooldown > 0 || ultimateActive > 0) return;

  slashCooldown = power.cooldown;
  attackFlash = 0.14;
  attackAnim = ATTACK_ANIM_MAX;
  attackTrailTimer = 0;
  shake = Math.max(shake, 8);
  slow = 0.05;

  const angle = Math.atan2(player.dirY, player.dirX);

  // 斬り込みを少し強めに
  player.x += Math.cos(angle) * 10;
  player.y += Math.sin(angle) * 10;
  player.x = clamp(player.x, player.r, W - player.r);
  player.y = clamp(player.y, player.r, H - player.r);
  const arc = Math.PI * 1.22;
  let kills = 0;

  // 見た目側は少し小さくして、本体が埋もれないようにする
  slashes.push({
    x: player.x,
    y: player.y,
    angle,
    range: power.range * 0.72,
    life: 0.16,
    maxLife: 0.16,
    width: 0.78
  });

  slashes.push({
    x: player.x + Math.cos(angle) * 4,
    y: player.y + Math.sin(angle) * 4,
    angle: angle + 0.05,
    range: power.range * 0.58,
    life: 0.10,
    maxLife: 0.10,
    width: 0.50
  });

  for (const e of enemies) {
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const d = Math.hypot(dx, dy);

    let a = Math.atan2(dy, dx) - angle;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;

    if (d < power.range && Math.abs(a) < arc / 2) {
      const nx = dx / (d || 1);
      const ny = dy / (d || 1);
      e.vx += nx * power.knockback;
      e.vy += ny * power.knockback;

      e.hp = Math.max(0, (e.hp ?? 1) - 1);

      if (e.hp <= 0) {
        e.dead = true;
        kills++;
        score += e.scoreValue ?? 10;
        addParticles(
          e.x,
          e.y,
          e.type === "daioni" ? 26 : (e.type === "onibi" ? 16 : 11),
          e.type === "daioni" ? 1.45 : (e.type === "onibi" ? 1.1 : 1),
          true
        );
      } else {
        addParticles(e.x, e.y, 8, 0.8, true);
        if (e.type === "daioni") {
          addText(e.x, e.y - 26, "重", false);
        }
      }
    }
  }

  if (kills > 0) {
    score += Math.floor(combo * 1.2);
    combo += kills;
    bestCombo = Math.max(bestCombo, combo);
    comboTimer = 1.35;
    ultimateGauge = clamp(ultimateGauge + kills * 4.5, 0, 100);

    shake = Math.max(shake, 10 + Math.min(kills, 16));
    slow = 0.09;

    addText(player.x, player.y - 54, `${kills}斬`, kills >= 5);

    if (kills >= 8) addText(player.x, player.y - 92, "一網打尽！", true);
    if (kills >= 14) addText(player.x, player.y - 128, "爽快！！", true);
  } else {
    combo = 0;
  }

  if (score >= 300) power.range = Math.max(power.range, 180);
  if (score >= 800) power.cooldown = Math.min(power.cooldown, 0.36);
  if (score >= 1500) power.range = Math.max(power.range, 220);
  if (score >= 2600) power.cooldown = Math.min(power.cooldown, 0.28);
}

function activateUltimate() {
  if (!running || ultimateGauge < 100 || ultimateActive > 0) return;

  ultimateGauge = 0;
  ultimateActive = 1.05;
  attackFlash = 0.4;
  slow = 0.22;
  shake = 18;
  comboTimer = 1.8;

  cutinLayer.classList.remove("show");
  void cutinLayer.offsetWidth;
  cutinLayer.classList.add("show");

  setTimeout(() => {
    cutinLayer.classList.remove("show");
  }, 820);

  ultimateWave = {
    x: -W * 0.45,
    y: H * 0.48,
    angle: -0.18,
    life: 0.72,
    maxLife: 0.72
  };

  let kills = 0;
  let bonusScore = 0;
  for (const e of enemies) {
    if (!e.dead) {
      e.dead = true;
      kills++;
      bonusScore += (e.scoreValue ?? 10) + (e.type === "daioni" ? 16 : 8);
      addParticles(e.x, e.y, e.type === "daioni" ? 28 : 18, e.type === "daioni" ? 1.5 : 1.3, true);
    }
  }

  score += bonusScore + 300;
  combo += kills;
  bestCombo = Math.max(bestCombo, combo);

  addText(W / 2, H * 0.34, "月蝕ノ舞", true);
  addText(W / 2, H * 0.45, `${kills}体一掃`, true);
}

attackBtn.addEventListener("click", slash);
attackBtn.addEventListener("touchstart", e => {
  e.preventDefault();
  slash();
});

ultimateBtn.addEventListener("click", activateUltimate);
ultimateBtn.addEventListener("touchstart", e => {
  e.preventDefault();
  activateUltimate();
});

stickBase.addEventListener(
  "touchstart",
  e => {
    const t = e.changedTouches[0];
    const rect = stickBase.getBoundingClientRect();

    joy.active = true;
    joy.id = t.identifier;
    joy.cx = rect.left + rect.width / 2;
    joy.cy = rect.top + rect.height / 2;

    e.preventDefault();
  },
  { passive: false }
);

stickBase.addEventListener(
  "touchmove",
  e => {
    for (const t of e.changedTouches) {
      if (t.identifier === joy.id) {
        const dx = t.clientX - joy.cx;
        const dy = t.clientY - joy.cy;
        const len = Math.hypot(dx, dy);
        const max = 38;

        const px = len > max ? (dx / len) * max : dx;
        const py = len > max ? (dy / len) * max : dy;

        joy.dx = px / max;
        joy.dy = py / max;

        stick.style.transform = `translate(${px}px, ${py}px)`;
      }
    }

    e.preventDefault();
  },
  { passive: false }
);

stickBase.addEventListener(
  "touchend",
  e => {
    for (const t of e.changedTouches) {
      if (t.identifier === joy.id) {
        joy.active = false;
        joy.id = null;
        joy.dx = 0;
        joy.dy = 0;
        stick.style.transform = "translate(0px, 0px)";
      }
    }

    e.preventDefault();
  },
  { passive: false }
);

const keys = {};
window.addEventListener("keydown", e => {
  keys[e.code] = true;

  if (e.code === "Space") {
    e.preventDefault();
    if (running) slash();
    else if (!titleScreen.classList.contains("hidden")) startGame();
  }

  if (e.code === "KeyE") {
    e.preventDefault();
    activateUltimate();
  }
});

window.addEventListener("keyup", e => {
  keys[e.code] = false;
});

function update(dt) {
  if (!running) return;

  if (slow > 0) {
    slow -= dt;
    dt *= 0.35;
  }

  time += dt;
  slashCooldown = Math.max(0, slashCooldown - dt);
  attackFlash = Math.max(0, attackFlash - dt);
  attackAnim = Math.max(0, attackAnim - dt);
  player.inv = Math.max(0, player.inv - dt);
  ultimateActive = Math.max(0, ultimateActive - dt);

  if (attackAnim > 0) {
    attackTrailTimer -= dt;
    if (attackTrailTimer <= 0) {
      afterimages.push({
        x: player.x,
        y: player.y,
        life: 0.14,
        maxLife: 0.14,
        facing: player.facing
      });
      attackTrailTimer = 0.045;
    }
  }

  comboTimer -= dt;
  if (comboTimer <= 0) combo = 0;

  let mx = joy.dx;
  let my = joy.dy;

  if (keys["KeyA"] || keys["ArrowLeft"]) mx -= 1;
  if (keys["KeyD"] || keys["ArrowRight"]) mx += 1;
  if (keys["KeyW"] || keys["ArrowUp"]) my -= 1;
  if (keys["KeyS"] || keys["ArrowDown"]) my += 1;

  const len = Math.hypot(mx, my);
  player.moving = len > 0.08;

  if (player.moving && ultimateActive <= 0) {
    mx /= len;
    my /= len;

    player.x += mx * player.speed * dt;
    player.y += my * player.speed * dt;

    // 移動中だけ歩行アニメを進める
    walkAnim += dt * 10;

    player.dirX = mx;
    player.dirY = my;

    if (Math.abs(mx) > Math.abs(my)) {
      player.facing = mx >= 0 ? "right" : "left";
    } else {
      player.facing = my >= 0 ? "front" : "back";
    }
  } else if (!player.moving) {
    // 停止中はアニメの位相を戻しておく
    walkAnim = 0;
  }

  player.x = clamp(player.x, player.r, W - player.r);
  player.y = clamp(player.y, player.r, H - player.r);

  spawnTimer -= dt;
  const diff = currentDifficulty();
  const interval = Math.max(0.04, (0.19 - time * 0.0024) * diff.intervalMul);

  while (spawnTimer <= 0) {
    spawnEnemy();

    if (time > 16 && Math.random() < Math.min(0.96, 0.45 * diff.extraMul)) spawnEnemy();
    if (time > 32 && Math.random() < Math.min(0.98, 0.65 * diff.extraMul)) spawnEnemy();
    if (time > 55 && Math.random() < Math.min(0.995, 0.8 * diff.extraMul)) spawnEnemy();

    spawnTimer += interval;
  }

  for (const e of enemies) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;

    e.vx += (dx / d) * e.speed * dt * 2.2;
    e.vy += (dy / d) * e.speed * dt * 2.2;

    e.vx *= Math.pow(0.08, dt);
    e.vy *= Math.pow(0.08, dt);

    e.x += e.vx * dt;
    e.y += e.vy * dt;

    // 小鬼の歩行アニメ位相
    e.anim += dt * 8;

    if (!e.dead && d < player.r + e.r && player.inv <= 0 && ultimateActive <= 0) {
      player.hp -= (e.damage ?? 10);
      player.inv = 0.45;
      combo = 0;
      shake = 10;
      addParticles(player.x, player.y, 10, 0.7, true);

      if (player.hp <= 0) {
        player.hp = 0;
        gameOver();
      }
    }
  }

  enemies = enemies.filter(e => {
    return (
      !e.dead &&
      e.x > -120 &&
      e.x < W + 120 &&
      e.y > -120 &&
      e.y < H + 120
    );
  });

  for (const p of particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.04, dt);
    p.vy *= Math.pow(0.04, dt);
  }

  particles = particles.filter(p => p.life > 0);

  for (const g of afterimages) {
    g.life -= dt;
  }
  afterimages = afterimages.filter(g => g.life > 0);

  if (attackFlash > 0) {
    ctx.save();
    ctx.globalAlpha = attackFlash * 0.045;
    const flash = ctx.createRadialGradient(player.x, player.y, 8, player.x, player.y, power.range * 0.52);
    flash.addColorStop(0, "rgba(255,255,255,0.72)");
    flash.addColorStop(0.4, "rgba(215,120,255,0.18)");
    flash.addColorStop(1, "rgba(120,60,255,0)");
    ctx.fillStyle = flash;
    ctx.beginPath();
    ctx.arc(player.x, player.y, power.range * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const tx of texts) {
    tx.life -= dt;
    tx.y += tx.vy * dt;
    tx.vy *= Math.pow(0.2, dt);
  }

  texts = texts.filter(tx => tx.life > 0);

  for (const s of slashes) s.life -= dt;
  slashes = slashes.filter(s => s.life > 0);

  if (ultimateWave) {
    ultimateWave.life -= dt;
    ultimateWave.x += W * 2.2 * dt;
    if (ultimateWave.life <= 0) ultimateWave = null;
  }

  shake *= Math.pow(0.01, dt);
  ultimateBtn.classList.toggle("ready", ultimateGauge >= 100);
}

function drawGrid() {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.lineWidth = 1;

  const size = 48;
  const ox = (-player.x * 0.06) % size;
  const oy = (-player.y * 0.06) % size;

  ctx.strokeStyle = "white";

  for (let x = ox; x < W; x += size) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  for (let y = oy; y < H; y += size) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  ctx.restore();
}

function getYuyuFrame() {
  const cols = 4;
  const rows = 4;
  const frameW = yuyuWalkImage.naturalWidth / cols;
  const frameH = yuyuWalkImage.naturalHeight / rows;

  let row = 0;
  let flip = false;

  if (player.facing === "front") row = 0;
  if (player.facing === "back") row = 1;
  if (player.facing === "left") row = 2;
  if (player.facing === "right") {
    row = 2;
    flip = true;
  }

  // 単純な 0→1→2→3 ではなく、往復型で自然な歩行にする
  const walkOrder = [0, 1, 2, 1];
  let col = player.moving
    ? walkOrder[Math.floor(walkAnim) % walkOrder.length]
    : 0;

  // ユユのスプライトも、大鬼と同じくコマ境界の混入が少し出ることがある。
  // とくに頭の上側に別コマの欠片が出やすいので、
  // ほんの少し内側を切り出す。
  const padX = Math.floor(frameW * 0.06);
  const padTop = Math.floor(frameH * 0.11);
  const padBottom = Math.floor(frameH * 0.08);

  return {
    sx: col * frameW + padX,
    sy: row * frameH + padTop,
    sw: frameW - padX * 2,
    sh: frameH - padTop - padBottom,
    flip
  };
}

function getYuyuAttackFrame() {
  // 攻撃素材は 3列×3段として読む。
  const cols = 3;
  const rows = 3;
  const frameW = yuyuAttackImage.naturalWidth / cols;
  const frameH = yuyuAttackImage.naturalHeight / rows;

  let row = 0;
  let flip = false;

  if (player.facing === "front") row = 0;
  if (player.facing === "back") row = 1;
  if (player.facing === "left") row = 2;
  if (player.facing === "right") {
    row = 2;
    flip = true;
  }

  // 3コマ攻撃: 構え → 振り → 振り抜き
  const p = 1 - attackAnim / ATTACK_ANIM_MAX;
  let col = 0;
  if (p < 0.34) col = 0;
  else if (p < 0.68) col = 1;
  else col = 2;

  // 横斬り(row=2)だけ頭上の余白削りが強すぎると、
  // 頭や角の上側が欠けて見えやすい。
  // なので side だけ上側の切り出しを甘くする。
  let padX = Math.floor(frameW * 0.12);
  let padTop = Math.floor(frameH * 0.13);
  let padBottom = Math.floor(frameH * 0.12);

  if (row === 2) {
    padX = Math.floor(frameW * 0.10);
    padTop = Math.floor(frameH * 0.05);
    padBottom = Math.floor(frameH * 0.10);
  }

  return {
    sx: col * frameW + padX,
    sy: row * frameH + padTop,
    sw: frameW - padX * 2,
    sh: frameH - padTop - padBottom,
    flip,
    row
  };
}

function getAttackPose() {
  if (attackAnim <= 0) {
    return {
      ox: 0,
      oy: 0,
      rot: 0,
      scale: 1,
      stretchX: 1,
      stretchY: 1
    };
  }

  const p = 1 - attackAnim / ATTACK_ANIM_MAX;
  const peak = Math.sin(p * Math.PI);

  return {
    ox: player.dirX * 10 * peak,
    oy: player.dirY * 10 * peak,
    rot: Math.sin(p * Math.PI) * 0.045 * (player.dirX >= 0 ? 1 : -1),
    scale: 1 + 0.035 * peak,
    stretchX: 1 + 0.05 * peak,
    stretchY: 1 - 0.025 * peak
  };
}

function drawYuyuSpriteAt(x, y, alpha = 1, ghost = false) {
  ctx.save();
  ctx.translate(x, y);

  const pose = ghost
    ? { ox: -player.dirX * 6, oy: -player.dirY * 6, rot: 0, scale: 1, stretchX: 1, stretchY: 1 }
    : getAttackPose();

  if (!ghost) {
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 48);
    glow.addColorStop(0, "rgba(220,120,255,0.38)");
    glow.addColorStop(1, "rgba(120,40,220,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.translate(pose.ox, pose.oy);
  ctx.rotate(pose.rot);
  ctx.scale(pose.stretchX * pose.scale, pose.stretchY * pose.scale);

  ctx.globalAlpha = ghost
    ? alpha
    : (player.inv > 0 ? 0.55 + Math.sin(time * 70) * 0.25 : alpha);

  const useAttackSprite = !ghost && attackAnim > 0 && yuyuAttackImage.complete && yuyuAttackImage.naturalWidth > 0;
  const sourceImage = useAttackSprite ? yuyuAttackImage : yuyuWalkImage;
  const f = useAttackSprite ? getYuyuAttackFrame() : getYuyuFrame();

  if (sourceImage.complete && sourceImage.naturalWidth > 0) {
    let scale = useAttackSprite
      ? 0.255
      : ((attackFlash > 0 ? 0.335 : 0.305) * (ghost ? 0.98 : 1));

    // 横向き攻撃は少しだけ縮めると頭上の見切れ感が減る
    if (useAttackSprite && f.row === 2) {
      scale = 0.245;
    }

    const dw = f.sw * scale;
    const dh = f.sh * scale;

    if (ghost) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha *= 0.45;
    }

    let drawY = useAttackSprite ? -dh * 0.64 : -dh * 0.69;
    if (useAttackSprite && f.row === 2) {
      drawY = -dh * 0.66;
    }

    if (f.flip) {
      ctx.scale(-1, 1);
      ctx.drawImage(
        sourceImage,
        f.sx, f.sy, f.sw, f.sh,
        -dw / 2, drawY,
        dw, dh
      );
    } else {
      ctx.drawImage(
        sourceImage,
        f.sx, f.sy, f.sw, f.sh,
        -dw / 2, drawY,
        dw, dh
      );
    }
  } else {
    ctx.fillStyle = "rgba(185,95,255,1)";
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawYuyu() {
  for (const g of afterimages) {
    const a = g.life / g.maxLife;
    drawYuyuSpriteAt(g.x, g.y, a * 0.30, true);
  }

  drawYuyuSpriteAt(player.x, player.y, 1, false);
}


function getOniFrame(enemy) {
  const cols = 4;
  const rows = 4;
  const frameW = oniWalkImage.naturalWidth / cols;
  const frameH = oniWalkImage.naturalHeight / rows;

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;

  let row = 0;
  let flip = false;

  // row 0: front, row 1: back, row 2: side
  if (Math.abs(dx) > Math.abs(dy)) {
    row = 2;
    flip = dx > 0; // player is to the right => face right by flipping
  } else {
    row = dy > 0 ? 0 : 1; // moving down => front, moving up => back
  }

  const walkOrder = [0, 1, 2, 1];
  const col = walkOrder[Math.floor(enemy.anim + enemy.animOffset) % walkOrder.length];

  return {
    sx: col * frameW,
    sy: row * frameH,
    sw: frameW,
    sh: frameH,
    flip
  };
}

function drawOniEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);

  // 影
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, enemy.r * 0.95, enemy.r * 1.05, enemy.r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  // うっすら赤いオーラ
  const glow = ctx.createRadialGradient(0, 0, 3, 0, 0, enemy.r * 2.6);
  glow.addColorStop(0, "rgba(255,80,80,0.18)");
  glow.addColorStop(1, "rgba(120,20,20,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, enemy.r * 2.2, 0, Math.PI * 2);
  ctx.fill();

  if (oniWalkImage.complete && oniWalkImage.naturalWidth > 0) {
    const f = getOniFrame(enemy);
    const scale = 0.27;
    const dw = f.sw * scale;
    const dh = f.sh * scale;

    if (f.flip) {
      ctx.scale(-1, 1);
      ctx.drawImage(
        oniWalkImage,
        f.sx, f.sy, f.sw, f.sh,
        -dw / 2, -dh * 0.70,
        dw, dh
      );
    } else {
      ctx.drawImage(
        oniWalkImage,
        f.sx, f.sy, f.sw, f.sh,
        -dw / 2, -dh * 0.70,
        dw, dh
      );
    }
  } else {
    ctx.fillStyle = "rgba(255, 90, 90, 0.95)";
    ctx.beginPath();
    ctx.arc(0, 0, enemy.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}



function getOnibiFrame(enemy) {
  const cols = 4;
  const rows = 4;
  const frameW = onibiWalkImage.naturalWidth / cols;
  const frameH = onibiWalkImage.naturalHeight / rows;

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;

  let row = 0;
  let flip = false;

  if (Math.abs(dx) > Math.abs(dy)) {
    row = 2;
    flip = dx > 0;
  } else {
    row = dy > 0 ? 0 : 1;
  }

  const walkOrder = [0, 1, 2, 1];
  const col = walkOrder[Math.floor(enemy.anim + enemy.animOffset) % walkOrder.length];

  return {
    sx: col * frameW,
    sy: row * frameH,
    sw: frameW,
    sh: frameH,
    flip
  };
}

function drawOnibiEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);

  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  ctx.ellipse(0, enemy.r * 0.9, enemy.r * 0.95, enemy.r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, enemy.r * 3.0);
  glow.addColorStop(0, "rgba(130,220,255,0.24)");
  glow.addColorStop(0.55, "rgba(90,120,255,0.16)");
  glow.addColorStop(1, "rgba(40,60,160,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, enemy.r * 2.5, 0, Math.PI * 2);
  ctx.fill();

  if (onibiWalkImage.complete && onibiWalkImage.naturalWidth > 0) {
    const f = getOnibiFrame(enemy);
    const scale = 0.22;
    const dw = f.sw * scale;
    const dh = f.sh * scale;

    if (f.flip) {
      ctx.scale(-1, 1);
      ctx.drawImage(
        onibiWalkImage,
        f.sx, f.sy, f.sw, f.sh,
        -dw / 2, -dh * 0.62,
        dw, dh
      );
    } else {
      ctx.drawImage(
        onibiWalkImage,
        f.sx, f.sy, f.sw, f.sh,
        -dw / 2, -dh * 0.62,
        dw, dh
      );
    }
  } else {
    ctx.fillStyle = "rgba(110,160,255,0.95)";
    ctx.beginPath();
    ctx.arc(0, 0, enemy.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}



function getDaioniFrame(enemy) {
  const cols = 4;
  const rows = 4;
  const frameW = daioniWalkImage.naturalWidth / cols;
  const frameH = daioniWalkImage.naturalHeight / rows;

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;

  let row = 0;
  let flip = false;

  if (Math.abs(dx) > Math.abs(dy)) {
    row = 2;
    flip = dx > 0;
  } else {
    row = dy > 0 ? 0 : 1;
  }

  const walkOrder = [0, 1, 2, 1];
  const col = walkOrder[Math.floor(enemy.anim + enemy.animOffset) % walkOrder.length];

  // 大鬼のスプライトは上下左右の余白が大きく、
  // そのまま切り出すと別コマの一部が混ざりやすい。
  // なので内側を少し削って安全に使う。
  const padX = Math.floor(frameW * 0.10);
  const padTop = Math.floor(frameH * 0.12);
  const padBottom = Math.floor(frameH * 0.14);

  return {
    sx: col * frameW + padX,
    sy: row * frameH + padTop,
    sw: frameW - padX * 2,
    sh: frameH - padTop - padBottom,
    flip
  };
}

function drawDaioniEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);

  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(0, enemy.r * 1.0, enemy.r * 1.2, enemy.r * 0.58, 0, 0, Math.PI * 2);
  ctx.fill();

  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, enemy.r * 2.8);
  glow.addColorStop(0, "rgba(255,110,70,0.20)");
  glow.addColorStop(0.55, "rgba(170,40,30,0.14)");
  glow.addColorStop(1, "rgba(90,15,15,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, enemy.r * 2.35, 0, Math.PI * 2);
  ctx.fill();

  if (daioniWalkImage.complete && daioniWalkImage.naturalWidth > 0) {
    const f = getDaioniFrame(enemy);

    // 少しだけ縮めつつ、足元基準で安定表示
    const scale = 0.31;
    const dw = f.sw * scale;
    const dh = f.sh * scale;
    const drawX = -dw / 2;
    const drawY = -dh * 0.66;

    if (f.flip) {
      ctx.scale(-1, 1);
      ctx.drawImage(
        daioniWalkImage,
        f.sx, f.sy, f.sw, f.sh,
        drawX, drawY,
        dw, dh
      );
    } else {
      ctx.drawImage(
        daioniWalkImage,
        f.sx, f.sy, f.sw, f.sh,
        drawX, drawY,
        dw, dh
      );
    }
  } else {
    ctx.fillStyle = "rgba(200, 70, 50, 0.95)";
    ctx.beginPath();
    ctx.arc(0, 0, enemy.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 大鬼だけ残HPを簡易表示
  const hpRate = (enemy.hp ?? 1) / (enemy.maxHp ?? 1);
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fillRect(-18, -enemy.r - 20, 36, 4);
  ctx.fillStyle = "rgba(255,145,105,0.95)";
  ctx.fillRect(-18, -enemy.r - 20, 36 * hpRate, 4);

  ctx.restore();
}

function draw() {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);

  const sx = rand(-shake, shake);
  const sy = rand(-shake, shake);

  ctx.save();
  ctx.translate(sx, sy);

  drawGrid();

  ctx.save();
  ctx.globalAlpha = slashCooldown <= 0 ? 0.08 : 0.03;
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(player.x, player.y, power.range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  for (const e of enemies) {
    if (e.type === "daioni") drawDaioniEnemy(e);
    else if (e.type === "onibi") drawOnibiEnemy(e);
    else drawOniEnemy(e);
  }

  for (const s of slashes) {
    const a = s.life / s.maxLife;
    const width = s.width ?? 1;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.globalAlpha = a * 0.82;

    const grad = ctx.createLinearGradient(0, -s.range, s.range, s.range);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.44, "rgba(255,255,255,0.70)");
    grad.addColorStop(0.58, "rgba(225,150,255,0.62)");
    grad.addColorStop(1, "rgba(120,60,255,0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, s.range, -Math.PI * 0.60 * width, Math.PI * 0.60 * width);
    ctx.closePath();
    ctx.fill();

    // 内側の芯は細めに
    ctx.globalAlpha = a * 0.52;
    ctx.strokeStyle = "rgba(255,255,255,0.78)";
    ctx.lineWidth = 5 * width;
    ctx.beginPath();
    ctx.arc(0, 0, s.range * 0.72, -Math.PI * 0.42 * width, Math.PI * 0.42 * width);
    ctx.stroke();

    // 前方ラインも控えめに
    ctx.globalAlpha = a * 0.34;
    ctx.strokeStyle = "rgba(220,120,255,0.80)";
    ctx.lineWidth = 2 * width;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(s.range * 0.90, 0);
    ctx.stroke();

    ctx.restore();
  }

  if (ultimateWave) {
    const a = ultimateWave.life / ultimateWave.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.min(1, a * 1.4);
    ctx.translate(ultimateWave.x, ultimateWave.y);
    ctx.rotate(ultimateWave.angle);
    if (moonSlashImage.complete && moonSlashImage.naturalWidth > 0) {
      const width = W * 1.45;
      const height = width * (moonSlashImage.naturalHeight / moonSlashImage.naturalWidth);
      ctx.drawImage(moonSlashImage, -width / 2, -height / 2, width, height);
    } else {
      ctx.strokeStyle = "rgba(210,80,255,0.95)";
      ctx.lineWidth = 34;
      ctx.beginPath();
      ctx.arc(0, 0, W * 0.55, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const p of particles) {
    const a = p.life / p.maxLife;

    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = p.violet ? "rgba(235,135,255,0.9)" : "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawYuyu();

  for (const tx of texts) {
    const a = tx.life / tx.maxLife;

    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `900 ${tx.size}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.strokeText(tx.text, tx.x, tx.y);
    ctx.fillStyle = "white";
    ctx.fillText(tx.text, tx.x, tx.y);
    ctx.restore();
  }

  ctx.restore();

  const hpRate = player.hp / player.maxHp;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(14, H - 18, W - 28, 6);

  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.fillRect(14, H - 18, (W - 28) * hpRate, 6);

  const cdRate = 1 - slashCooldown / power.cooldown;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(14, H - 30, W - 28, 4);

  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.fillRect(14, H - 30, (W - 28) * clamp(cdRate, 0, 1), 4);

  ctx.fillStyle = "rgba(160,60,220,0.24)";
  ctx.fillRect(14, H - 44, W - 28, 7);
  ctx.fillStyle = "rgba(220,110,255,0.9)";
  ctx.fillRect(14, H - 44, (W - 28) * (ultimateGauge / 100), 7);
  ctx.restore();

  const oniCount = enemies.filter(e => e.type === "oni").length;
  const onibiCount = enemies.filter(e => e.type === "onibi").length;
  const daioniCount = enemies.filter(e => e.type === "daioni").length;

  stats.innerHTML = `
    ユユ / SCORE ${score}<br>
    難易度 ${currentDifficulty().label}　COMBO ${combo} / BEST ${bestCombo}<br>
    HP ${Math.ceil(player.hp)}　月蝕 ${Math.floor(ultimateGauge)}%　敵 ${enemies.length}<br>
    小鬼 ${oniCount}　鬼火 ${onibiCount}　大鬼 ${daioniCount}
  `;
}

let last = performance.now();

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
