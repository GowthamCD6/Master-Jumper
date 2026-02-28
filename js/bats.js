const BAT_SIZE      = 28;
const BAT_DETECT    = 120;
const BAT_SPEED     = 1.2;
const BAT_SWOOP_SPD = 1.8;
const BAT_DESCEND_SPD = 1.5;
const BAT_READY_TIME = 25;
const BAT_SIDE_OFFSET = 65;
const BAT_BOB_AMP   = 6;
const HIT_COOLDOWN  = 90;
const HIT_KNOCKBACK = -3;
const BAT_ANIM_SPEED = 6;
const BAT_MAX_HP     = 3;
const BAT_HIT_STUN  = 40;
const BAT_HIT_KNOCKBACK = 2.5;
const BAT_DEATH_TIME = 30;

const _batParticles = [];
function _spawnParticles(x, y, count, color, speed, life) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = (0.5 + Math.random()) * speed;
    _batParticles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 0.5,
      life: life + Math.floor(Math.random() * 10),
      maxLife: life + 10,
      size: 1.5 + Math.random() * 2,
      color,
    });
  }
}
function _updateAndDrawParticles() {
  for (let i = _batParticles.length - 1; i >= 0; i--) {
    const p = _batParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.04;
    p.life--;
    if (p.life <= 0) { _batParticles.splice(i, 1); continue; }
    const alpha = p.life / p.maxLife;
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = p.color;
    c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    c.restore();
  }
}

const BAT_FRAMES = [
  { sx: 35, sy: 5,  sw: 27, sh: 22 },
  { sx: 66, sy: 6,  sw: 29, sh: 15 },
  { sx: 97, sy: 1,  sw: 31, sh: 21 },
  { sx: 66, sy: 70, sw: 29, sh: 13 },
];
const BAT_ATTACK_FRAME = { sx: 3, sy: 20, sw: 25, sh: 11 };

let heroHP            = 3;
let HERO_MAX_HP       = 3;
let heroInvincible    = 0;
let heroHitAnimFrames = 0;
let screenShake       = 0;
let damageFlash       = 0;
let batsKilled        = 0;
let highestY          = 0;

let gameOver      = false;
let deathTimer    = 0;
const DEATH_DELAY = 90;

const batImg = new Image();
batImg.src = "./img/warrior/bat.png";
let batLoaded = false;
batImg.onload = () => { batLoaded = true; };

const takeHitImg = new Image();
takeHitImg.src = "./img/warrior/Take Hit.png";

const deathImg = new Image();
deathImg.src = "./img/warrior/Death.png";

class Bat {
  constructor({ x, y, patrolLeft, patrolRight }) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.patrolLeft  = patrolLeft;
    this.patrolRight = patrolRight;
    this.vx = BAT_SPEED * (Math.random() > 0.5 ? 1 : -1);
    this.vy = 0;
    this.animFrame = Math.floor(Math.random() * BAT_FRAMES.length);
    this.animTick  = 0;
    this.flyTime   = Math.random() * Math.PI * 2;
    this.state = "patrol";
    this.swoopTarget = { x: 0, y: 0 };
    this.chargeFromX = 0;
    this.readyTimer  = 0;       
    this.returnTimer = 0;
    this.alive = true;
    this.hp       = BAT_MAX_HP;
    this.hitStun  = 0;
    this.hitFlash = 0;
    this.dying     = false;
    this.deathTimer = 0;
    this.deathSpin  = 0;
  }

  update() {
    if (!this.alive && !this.dying) return;

    if (this.dying) {
      this.deathTimer++;
      this.deathSpin += 0.3;
      this.y += 1.2;
      this.x += this.vx * 0.15; 
      if (this.deathTimer >= BAT_DEATH_TIME) {
        this.dying = false;
        _spawnParticles(this.x, this.y, 8, "#FF4400", 1.5, 20);
        _spawnParticles(this.x, this.y, 5, "#FFCC00", 1.0, 15);
      }
      return;
    }

    if (!this.alive) return;

    if (this.hitStun > 0) {
      this.hitStun--;
      this.x += this.vx * 0.3;
      this.y += (this.baseY - this.y) * 0.04;
      this.flyTime += 0.06;
      this.animTick++;
      if (this.animTick >= BAT_ANIM_SPEED) {
        this.animTick = 0;
        this.animFrame = (this.animFrame + 1) % BAT_FRAMES.length;
      }
      if (this.hitStun <= 0) {
        this.state = "return";
        this.returnTimer = 50;
      }
      return;
    }

    this.animTick++;
    if (this.animTick >= BAT_ANIM_SPEED) {
      this.animTick = 0;
      this.animFrame = (this.animFrame + 1) % BAT_FRAMES.length;
    }
    this.flyTime += 0.06;

    const ph = player.hitbox;
    const px = ph.position.x + ph.width / 2;
    const py = ph.position.y + ph.height / 2;
    const distX = px - this.x;
    const distY = py - this.y;
    const dist  = Math.sqrt(distX * distX + distY * distY);

    switch (this.state) {
      case "patrol":
        this.x += this.vx;
        this.y = this.baseY + Math.sin(this.flyTime) * BAT_BOB_AMP;

        if (this.x <= this.patrolLeft)  this.vx = Math.abs(this.vx);
        if (this.x >= this.patrolRight) this.vx = -Math.abs(this.vx);

        if (dist < BAT_DETECT && heroInvincible <= 0) {
          this.state = "descend";
          this.swoopTarget.x = px;
          this.swoopTarget.y = py;
          if (this.x >= px) {
            this.chargeFromX = Math.min(px + BAT_SIDE_OFFSET, WORLD_WIDTH - BAT_SIZE);
          } else {
            this.chargeFromX = Math.max(px - BAT_SIDE_OFFSET, BAT_SIZE);
          }
        }
        break;

      case "descend":
        {
          this.swoopTarget.y = py;
          const targetY = this.swoopTarget.y;
          const dy = targetY - this.y;

          this.x += (this.chargeFromX - this.x) * 0.06;
          const descendBob = Math.sin(this.flyTime * 2) * 2;

          if (Math.abs(dy) > 6) {
            const easeFactor = Math.min(1, Math.abs(dy) / 60);
            this.y += Math.sign(dy) * BAT_DESCEND_SPD * (0.4 + easeFactor * 0.6) + descendBob * 0.1;
          } else {
            this.y = targetY;
            this.state = "ready";
            this.readyTimer = BAT_READY_TIME;
            this.vx = px > this.x ? BAT_SWOOP_SPD : -BAT_SWOOP_SPD;
          }
        }
        break;

      case "ready":
        {
          this.y = py + Math.sin(this.flyTime * 1.5) * 3;
          this.vx = px > this.x ? Math.abs(this.vx) : -Math.abs(this.vx);

          this.readyTimer--;
          if (this.readyTimer <= 0) {
            this.swoopTarget.x = px;
            this.swoopTarget.y = py;
            this.state = "charge";
          }
        }
        break;

      case "charge":
        {
          this.x += this.vx;
          this.y += (this.swoopTarget.y - this.y) * 0.04;

          const dxCharge = Math.abs(px - this.x);
          if (dxCharge < 4 || Math.abs(this.x - this.chargeFromX) > BAT_DETECT * 2.5) {
            this.state = "return";
            this.returnTimer = 70;
          }
        }
        break;

      case "return":
        {
          const toBaseY = this.baseY - this.y;
          this.y += toBaseY * 0.06 + Math.sin(this.flyTime) * 0.5;
          const patrolCenter = (this.patrolLeft + this.patrolRight) / 2;
          this.x += (patrolCenter - this.x) * 0.04;
          this.returnTimer--;
          if (this.returnTimer <= 0 && Math.abs(this.y - this.baseY) < 5) {
            this.state = "patrol";
            this.vx = BAT_SPEED * (this.x < patrolCenter ? 1 : -1);
          }
        }
        break;
    }
  }

  takeHit(heroX) {
    this.hp--;
    this.hitFlash = 14;

    _spawnParticles(this.x, this.y, 6, "#FFFFFF", 1.8, 12);
    _spawnParticles(this.x, this.y, 4, "#FFDD44", 1.2, 10);

    if (this.hp <= 0) {
      this.alive = false;
      this.dying = true;
      this.deathTimer = 0;
      this.vx = heroX < this.x ? 1.5 : -1.5;
      batsKilled++;
      _spawnParticles(this.x, this.y, 10, "#FF2200", 2.0, 18);
      _spawnParticles(this.x, this.y, 6, "#FFAA00", 1.5, 14);
      return;
    }
    this.vx = heroX < this.x ? BAT_HIT_KNOCKBACK : -BAT_HIT_KNOCKBACK;
    this.hitStun = BAT_HIT_STUN;
    this.state = "stunned";
  }

  draw() {
    if (!batLoaded) return;
    if (!this.alive && !this.dying) return;

    const frame  = this.state === "charge"
      ? BAT_ATTACK_FRAME
      : BAT_FRAMES[this.animFrame % BAT_FRAMES.length];
    const facing = this.vx >= 0 ? 1 : -1;

    const aspect = frame.sw / frame.sh;
    let drawW = BAT_SIZE;
    let drawH = BAT_SIZE / aspect;
    if (drawH > BAT_SIZE) { drawH = BAT_SIZE; drawW = BAT_SIZE * aspect; }

    c.save();
    c.translate(this.x, this.y);

    if (this.dying) {
      const deathProg = this.deathTimer / BAT_DEATH_TIME;
      c.globalAlpha = 1 - deathProg;
      c.rotate(this.deathSpin);
      c.scale(1 - deathProg * 0.5, 1 - deathProg * 0.5);
    }

    if (this.hitStun > 0) {
      const shakeAmt = Math.min(this.hitStun / 10, 1) * 2;
      c.translate((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);
    }

    c.scale(facing, 1);

    c.drawImage(
      batImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -drawW / 2, -drawH / 2, drawW, drawH,
    );

    if (this.hitFlash > 0) {
      this.hitFlash--;
      const flashAlpha = Math.min(1, this.hitFlash / 6) * 0.85;
      c.save();
      c.globalAlpha = flashAlpha;
      if (this.hitFlash > 7) {
        c.filter = "brightness(5)";
      } else {
        c.filter = "brightness(3) sepia(1) saturate(10) hue-rotate(-10deg)";
      }
      c.drawImage(
        batImg,
        frame.sx, frame.sy, frame.sw, frame.sh,
        -drawW / 2, -drawH / 2, drawW, drawH,
      );
      c.restore();
    }

    c.restore();

    if (this.alive && this.hp < BAT_MAX_HP) {
      const barW = 24;
      const barH = 3;
      const barX = this.x - barW / 2;
      const barY = this.y - BAT_SIZE / 2 - 6;

      c.fillStyle = "rgba(0,0,0,0.6)";
      c.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

      c.fillStyle = "#441111";
      c.fillRect(barX, barY, barW, barH);

      const pct = this.hp / BAT_MAX_HP;
      const grad = c.createLinearGradient(barX, barY, barX + barW * pct, barY);
      grad.addColorStop(0, "#FF4444");
      grad.addColorStop(1, pct > 0.5 ? "#FF8844" : "#FF2222");
      c.fillStyle = grad;
      c.fillRect(barX, barY, barW * pct, barH);

      c.fillStyle = "rgba(0,0,0,0.3)";
      for (let s = 1; s < BAT_MAX_HP; s++) {
        c.fillRect(barX + (barW / BAT_MAX_HP) * s, barY, 1, barH);
      }
    }
  }

  checkHit() {
    if (!this.alive) return false;
    if (heroInvincible > 0) return false;
    if (this.state !== "charge") return false;

    const ph = player.hitbox;
    const batHalf = BAT_SIZE * 0.4;
    const bLeft   = this.x - batHalf;
    const bRight  = this.x + batHalf;
    const bTop    = this.y - batHalf;
    const bBottom = this.y + batHalf;

    const pLeft   = ph.position.x;
    const pRight  = ph.position.x + ph.width;
    const pTop    = ph.position.y;
    const pBottom = ph.position.y + ph.height;

    const batCenterY = (bTop + bBottom) / 2;
    const heroCenterY = (pTop + pBottom) / 2;
    if (Math.abs(batCenterY - heroCenterY) > ph.height * 0.7) return false;

    return pRight > bLeft && pLeft < bRight && pBottom > bTop && pTop < bBottom;
  }
}

const bats = [];
let _nextBatSpawn = 5;

function _batRng(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const _brng = _batRng(314);

{
  for (let i = 0; i < platformGroups.length; i++) {
    if (i < _nextBatSpawn) continue;

    const plat = platformGroups[i];

    const cx = plat.x + plat.width / 2;
    const patrolSpread = 40 + _brng() * 50;
    const patrolLeft   = Math.max(BAT_SIZE, cx - patrolSpread);
    const patrolRight  = Math.min(WORLD_WIDTH - BAT_SIZE, cx + patrolSpread);

    const hoverY = plat.y - 30 - _brng() * 25;

    bats.push(new Bat({
      x: cx,
      y: hoverY,
      patrolLeft,
      patrolRight,
    }));

    _nextBatSpawn = i + 3 + Math.floor(_brng() * 3);
  }
}

function _maybeSpawnBat(idx) {
  if (idx < _nextBatSpawn) return;
  const plat = platformGroups[idx];
  const cx = plat.x + plat.width / 2;
  const patrolSpread = 40 + _brng() * 50;
  const patrolLeft   = Math.max(BAT_SIZE, cx - patrolSpread);
  const patrolRight  = Math.min(WORLD_WIDTH - BAT_SIZE, cx + patrolSpread);
  const hoverY = plat.y - 30 - _brng() * 25;
  bats.push(new Bat({ x: cx, y: hoverY, patrolLeft, patrolRight }));
  _nextBatSpawn = idx + 3 + Math.floor(_brng() * 3);
}

function updateBats() {
  if (heroInvincible > 0) heroInvincible--;
  if (heroHitAnimFrames > 0) heroHitAnimFrames--;

  if (isAttacking) checkAttackHitBats();

  bats.forEach((bat) => {
    bat.update();
    bat.draw();
  });

  _updateAndDrawParticles();

  bats.forEach((bat) => {
    if (bat.checkHit()) {
      // Fly power – bat dies instantly on contact
      if (flyPowerActive) {
        const heroMidX = player.hitbox.position.x + player.hitbox.width / 2;
        bat.hp = 1;          // ensure one hit kills
        bat.takeHit(heroMidX);
        _spawnFlyBurst(10, "#FFEE55");  // golden burst on kill
        return;
      }

      if (isAttacking) {
        const heroMidX = player.hitbox.position.x + player.hitbox.width / 2;
        bat.takeHit(heroMidX);
        return;
      }

      heroHP--;
      if (heroHP < 0) heroHP = 0;
      heroInvincible = HIT_COOLDOWN;
      heroHitAnimFrames = 30;
      screenShake = 12;
      damageFlash = 15;

      player.velocity.y = HIT_KNOCKBACK;
      const knockDir = player.hitbox.position.x < bat.x ? -2 : 2;
      player.velocity.x = knockDir;

      bat.state = "return";
      bat.returnTimer = 90;

      if (heroHP <= 0) {
        heroHP = 0;
        gameOver = true;
        deathTimer = 0;
      }
    }
  });
}

const ATTACK_REACH_BY_COMBO = [35, 50, 45];

function checkAttackHitBats() {
  const ph = player.hitbox;
  const heroMidY = ph.position.y + ph.height / 2;

  const reach = ATTACK_REACH_BY_COMBO[attackCombo] || ATTACK_REACH_BY_COMBO[0];
  let atkLeft, atkRight;
  if (player.lastDirection === "right") {
    atkLeft  = ph.position.x + ph.width;
    atkRight = atkLeft + reach;
  } else {
    atkRight = ph.position.x;
    atkLeft  = atkRight - reach;
  }
  const atkTop    = ph.position.y - 5;
  const atkBottom = ph.position.y + ph.height + 5;

  bats.forEach((bat) => {
    if (!bat.alive) return;
    if (bat.hitStun > 0) return;
    const batHalf = BAT_SIZE * 0.4;
    const bLeft   = bat.x - batHalf;
    const bRight  = bat.x + batHalf;
    const bTop    = bat.y - batHalf;
    const bBottom = bat.y + batHalf;

    if (atkRight > bLeft && atkLeft < bRight && atkBottom > bTop && atkTop < bBottom) {
      const heroMidX = ph.position.x + ph.width / 2;
      bat.takeHit(heroMidX);
    }
  });
}

function drawHeroHitEffect() {
  if (screenShake > 0) {
    screenShake--;
    const shakeX = (Math.random() - 0.5) * 4;
    const shakeY = (Math.random() - 0.5) * 4;
    c.translate(shakeX, shakeY);
  }

  if (heroInvincible > 0 && Math.floor(heroInvincible / 4) % 2 === 0) {
    const ph = player.hitbox;
    c.save();
    c.globalAlpha = 0.4;
    c.fillStyle = "#FFFFFF";
    c.fillRect(ph.position.x - 5, ph.position.y - 5, ph.width + 10, ph.height + 10);
    c.restore();
  }

}

function drawGameOverScreen() {
  if (!gameOver) return;
  deathTimer++;

  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const t  = deathTimer;

  c.save();
  c.textAlign    = "center";
  c.textBaseline = "middle";

  const bgAlpha = Math.min(0.88, t / 55);
  c.fillStyle = `rgba(4,0,0,${bgAlpha})`;
  c.fillRect(0, 0, W, H);

  const vigAlpha = Math.min(0.55, t / 70);
  const vig = c.createRadialGradient(cx, cy, H * 0.1, cx, cy, H * 0.75);
  vig.addColorStop(0, `rgba(60,0,0,0)`);
  vig.addColorStop(1, `rgba(100,0,0,${vigAlpha})`);
  c.fillStyle = vig;
  c.fillRect(0, 0, W, H);

  if (t > 15) {
    c.fillStyle = "rgba(0,0,0,0.08)";
    for (let ly = 0; ly < H; ly += 4) c.fillRect(0, ly, W, 2);
  }

  if (t > 8) {
    const skullA = Math.min(1, (t - 8) / 20);
    c.save();
    c.globalAlpha = skullA;
    c.shadowColor = "#FF0000";
    c.shadowBlur  = 24 + 8 * Math.sin(t * 0.08);
    c.font        = "44px serif";
    c.fillStyle   = "#FF2222";
    c.fillText("☠", cx, cy - 90);
    c.restore();
  }

  if (t > 18) {
    const titleA   = Math.min(1, (t - 18) / 18);
    const pulse    = 1 + 0.018 * Math.sin(t * 0.07);
    const titleY   = cy - 36;

    c.save();
    c.globalAlpha = titleA;
    c.scale(pulse, pulse);

    const ty = titleY / pulse;
    const tcx = cx / pulse;

    c.font      = "bold 58px monospace";
    c.fillStyle = "rgba(0,0,0,0.75)";
    c.fillText("YOU DIED", tcx + 4, ty + 4);

    c.shadowColor = "#FF0000";
    c.shadowBlur  = 30 + 12 * Math.sin(t * 0.06);
    c.fillStyle   = "#880000";
    c.fillText("YOU DIED", tcx, ty);

    c.shadowBlur = 0;
    const tg = c.createLinearGradient(tcx - 120, ty - 28, tcx + 120, ty + 28);
    tg.addColorStop(0,   "#FF6666");
    tg.addColorStop(0.4, "#EE1111");
    tg.addColorStop(0.7, "#CC0000");
    tg.addColorStop(1,   "#880000");
    c.fillStyle = tg;
    c.fillText("YOU DIED", tcx, ty);

    c.fillStyle = "rgba(255,200,200,0.18)";
    c.fillText("YOU DIED", tcx, ty);

    c.restore();
  }

  if (t > 38) {
    const statsA = Math.min(1, (t - 38) / 20);
    const heightClimbed = Math.max(0, Math.floor((WORLD_HEIGHT - highestY) / 16));

    const cardW = 220;
    const cardH = 110;
    const cardX = cx - cardW / 2;
    const cardY = cy + 2;

    c.save();
    c.globalAlpha = statsA;

    c.fillStyle = "rgba(8,0,0,0.82)";
    _roundRect(c, cardX, cardY, cardW, cardH, 10);
    c.fill();

    const borderGrad = c.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    borderGrad.addColorStop(0,   "rgba(180,30,30,0.8)");
    borderGrad.addColorStop(0.5, "rgba(255,80,80,0.5)");
    borderGrad.addColorStop(1,   "rgba(100,10,10,0.8)");
    c.strokeStyle = borderGrad;
    c.lineWidth   = 1.5;
    _roundRect(c, cardX, cardY, cardW, cardH, 10);
    c.stroke();

    c.strokeStyle = "rgba(180,40,40,0.35)";
    c.lineWidth   = 1;
    c.beginPath();
    c.moveTo(cardX + 16, cardY + 36);
    c.lineTo(cardX + cardW - 16, cardY + 36);
    c.stroke();

    c.font = "bold 13px monospace";

    const rows = [
      { icon: "🪙", label: "Coins",  value: coinScore,      color: "#FFD700" },
      { icon: "💀", label: "Kills",  value: batsKilled,     color: "#FF7766" },
      { icon: "⬆",  label: "Height", value: heightClimbed + "m", color: "#88CCFF" },
    ];

    c.fillStyle = "rgba(255,100,100,0.7)";
    c.font      = "10px monospace";
    c.fillText("— SESSION STATS —", cx, cardY + 20);

    rows.forEach((row, i) => {
      const ry = cardY + 57 + i * 22;

      if (i % 2 === 0) {
        c.fillStyle = "rgba(255,255,255,0.03)";
        c.fillRect(cardX + 8, ry - 9, cardW - 16, 18);
      }

      c.font      = "13px monospace";
      c.fillStyle = "rgba(180,180,180,0.5)";
      c.textAlign = "left";
      c.fillText(row.icon + " " + row.label, cardX + 18, ry);

      c.font      = "bold 13px monospace";
      c.fillStyle = row.color;
      c.textAlign = "right";
      c.fillText(row.value, cardX + cardW - 18, ry);
    });

    c.restore();
  }

  if (t > DEATH_DELAY) {
    const blinkPhase = Math.sin(t * 0.09);
    const promptA    = Math.max(0, blinkPhase) * Math.min(1, (t - DEATH_DELAY) / 15);
    const glowAmt    = 8 + 6 * Math.abs(blinkPhase);

    c.save();
    c.globalAlpha = promptA;
    c.textAlign   = "center";
    c.shadowColor = "rgba(255,200,200,0.9)";
    c.shadowBlur  = glowAmt;
    c.font        = "bold 15px monospace";
    c.fillStyle   = "#FFFFFF";
    c.fillText("— Press any key to restart —", cx, cy + 135);
    c.restore();
  }

  c.restore();
}

function drawHPHearts() {
  if (player.position.y < highestY) highestY = player.position.y;
  const heightClimbed = Math.max(0, Math.floor((WORLD_HEIGHT - highestY) / 16));

  c.save();
  c.textBaseline = "middle";
  c.textAlign    = "left";

  const HEART = 16;          // heart icon size
  const GAP   = 6;           // gap between hearts
  const PAD_X = 10;          // left padding inside panel
  const PAD_Y = 10;          // top of panel from canvas edge

  // ── Measure widths ─────────────────────────────────────────
  const labelW  = 26;        // width taken by "HP " label
  const heartsW = HERO_MAX_HP * HEART + (HERO_MAX_HP - 1) * GAP;
  const panW    = PAD_X + labelW + heartsW + PAD_X;  // ~112 for 3 hearts
  const panH    = 34;

  // ╔══════════════════════════════════════╗
  //  HP PANEL
  // ╚══════════════════════════════════════╝
  c.fillStyle = "rgba(8,8,16,0.82)";
  _roundRect(c, PAD_Y, PAD_Y, panW, panH, 7);
  c.fill();
  c.strokeStyle = "rgba(255,255,255,0.13)";
  c.lineWidth   = 1;
  _roundRect(c, PAD_Y, PAD_Y, panW, panH, 7);
  c.stroke();

  // "HP" label
  c.font      = "bold 10px monospace";
  c.fillStyle = "#EE8888";
  c.fillText("HP", PAD_Y + PAD_X, PAD_Y + panH / 2);

  // Hearts row
  const hStartX = PAD_Y + PAD_X + labelW;
  const hStartY = PAD_Y + (panH - HEART) / 2;

  for (let i = 0; i < HERO_MAX_HP; i++) {
    const hx = hStartX + i * (HEART + GAP);
    if (i < heroHP) {
      const pulse = heroHP === 1
        ? 0.55 + 0.45 * Math.abs(Math.sin(Date.now() / 280))
        : 1;
      c.shadowColor = `rgba(220,40,40,${0.55 * pulse})`;
      c.shadowBlur  = heroHP === 1 ? 10 * pulse : 4;
      c.fillStyle   = heroHP === 1
        ? `rgba(${Math.round(220 + 35 * pulse)},${Math.round(30 * pulse)},${Math.round(30 * pulse)},1)`
        : "#DD1111";
    } else {
      c.shadowBlur = 0;
      c.fillStyle  = "rgba(255,255,255,0.08)";
    }
    _drawMiniHeart(c, hx, hStartY, HEART);
    c.shadowBlur = 0;
  }

  const sY   = PAD_Y + panH + 5;
  const sH   = 20;
  const sW   = panW;

  c.fillStyle = "rgba(8,8,16,0.75)";
  _roundRect(c, PAD_Y, sY, sW, sH, 5);
  c.fill();
  c.strokeStyle = "rgba(255,255,255,0.08)";
  c.lineWidth   = 1;
  _roundRect(c, PAD_Y, sY, sW, sH, 5);
  c.stroke();

  const midY = sY + sH / 2;

  c.font      = "bold 10px monospace";
  c.fillStyle = "#FF7755";
  c.fillText("\u2694 " + batsKilled, PAD_Y + PAD_X, midY);
  const divX = PAD_Y + sW / 2;
  c.fillStyle = "rgba(255,255,255,0.18)";
  c.fillRect(divX, sY + 4, 1, sH - 8);

  c.fillStyle = "#77BBFF";
  c.fillText("\u2191 " + heightClimbed + "m", divX + 8, midY);

  if (heroHP === 1 && !gameOver) {
    const vigAlpha = 0.32 * (0.5 + 0.5 * Math.sin(Date.now() / 300));
    const vigGrad  = c.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
      canvas.width / 2, canvas.height / 2, canvas.height * 0.7
    );
    vigGrad.addColorStop(0, "rgba(80,0,0,0)");
    vigGrad.addColorStop(1, "rgba(130,0,0," + vigAlpha + ")");
    c.fillStyle = vigGrad;
    c.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ── Damage flash ───────────────────────────────────────────
  if (damageFlash > 0) {
    damageFlash--;
    c.fillStyle = "rgba(200,0,0," + (damageFlash / 30) + ")";
    c.fillRect(0, 0, canvas.width, canvas.height);
  }

  c.restore();
}

function _drawMiniHeart(ctx, x, y, size) {
  const s = size / 12;
  ctx.beginPath();
  ctx.moveTo(x + 6 * s, y + 10 * s);
  ctx.bezierCurveTo(x + 1 * s, y + 7 * s, x, y + 4 * s, x + 2 * s, y + 2.5 * s);
  ctx.bezierCurveTo(x + 3.5 * s, y + 1 * s, x + 5.5 * s, y + 1.5 * s, x + 6 * s, y + 3 * s);
  ctx.bezierCurveTo(x + 6.5 * s, y + 1.5 * s, x + 8.5 * s, y + 1 * s, x + 10 * s, y + 2.5 * s);
  ctx.bezierCurveTo(x + 12 * s, y + 4 * s, x + 11 * s, y + 7 * s, x + 6 * s, y + 10 * s);
  ctx.fill();
}