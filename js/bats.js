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

const BAT_FRAMES = [
  { sx: 35, sy: 5,  sw: 27, sh: 22 },
  { sx: 66, sy: 6,  sw: 29, sh: 15 },
  { sx: 97, sy: 1,  sw: 31, sh: 21 },
  { sx: 66, sy: 70, sw: 29, sh: 13 },
];
const BAT_ATTACK_FRAME = { sx: 3, sy: 20, sw: 25, sh: 11 };

let heroHP            = 3;
let heroInvincible    = 0;
let heroHitAnimFrames = 0;

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
    this.state = "patrol";
    this.swoopTarget = { x: 0, y: 0 };
    this.chargeFromX = 0;
    this.readyTimer  = 0;       
    this.returnTimer = 0;
    this.alive = true;
  }

  update() {
    if (!this.alive) return;

    this.animTick++;
    if (this.animTick >= BAT_ANIM_SPEED) {
      this.animTick = 0;
      this.animFrame = (this.animFrame + 1) % BAT_FRAMES.length;
    }

    const ph = player.hitbox;
    const px = ph.position.x + ph.width / 2;
    const py = ph.position.y + ph.height / 2;
    const distX = px - this.x;
    const distY = py - this.y;
    const dist  = Math.sqrt(distX * distX + distY * distY);

    switch (this.state) {
      case "patrol":
        this.x += this.vx;
        this.y = this.baseY + Math.sin(this.animFrame * 1.2) * BAT_BOB_AMP;

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

          this.x += (this.chargeFromX - this.x) * 0.08;

          if (Math.abs(dy) > 6) {
            this.y += Math.sign(dy) * BAT_DESCEND_SPD;
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
          this.y = py + Math.sin(this.animFrame * 0.8) * 2;
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
          this.y += toBaseY * 0.05;
          const patrolCenter = (this.patrolLeft + this.patrolRight) / 2;
          this.x += (patrolCenter - this.x) * 0.03;
          this.returnTimer--;
          if (this.returnTimer <= 0 && Math.abs(this.y - this.baseY) < 5) {
            this.state = "patrol";
            this.vx = BAT_SPEED * (this.x < patrolCenter ? 1 : -1);
          }
        }
        break;
    }
  }

  draw() {
    if (!this.alive || !batLoaded) return;

    const frame  = (this.state === "descend" || this.state === "ready" || this.state === "charge")
      ? BAT_ATTACK_FRAME
      : BAT_FRAMES[this.animFrame % BAT_FRAMES.length];
    const facing = this.vx >= 0 ? 1 : -1;

    const aspect = frame.sw / frame.sh;
    let drawW = BAT_SIZE;
    let drawH = BAT_SIZE / aspect;
    if (drawH > BAT_SIZE) { drawH = BAT_SIZE; drawW = BAT_SIZE * aspect; }

    c.save();
    c.translate(this.x, this.y);
    c.scale(facing, 1);

    c.drawImage(
      batImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -drawW / 2, -drawH / 2, drawW, drawH,    
    );

    c.restore();
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
  let nextSpawn = 5; 

  for (let i = 0; i < platformGroups.length; i++) {
    if (i < nextSpawn) continue;

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

    nextSpawn = i + 3 + Math.floor(_brng() * 3);
  }
}

function updateBats() {
  if (heroInvincible > 0) heroInvincible--;
  if (heroHitAnimFrames > 0) heroHitAnimFrames--;

  if (isAttacking) checkAttackHitBats();

  bats.forEach((bat) => {
    bat.update();
    bat.draw();

    if (bat.checkHit()) {
      if (isAttacking) {
        bat.alive = false;
        return;
      }

      heroHP--;
      heroInvincible = HIT_COOLDOWN;
      heroHitAnimFrames = 30;

      player.velocity.y = HIT_KNOCKBACK;
      const knockDir = player.hitbox.position.x < bat.x ? -2 : 2;
      player.velocity.x = knockDir;

      bat.state = "return";
      bat.returnTimer = 90;

      if (heroHP <= 0) {
        heroHP = 0;
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
    const batHalf = BAT_SIZE * 0.4;
    const bLeft   = bat.x - batHalf;
    const bRight  = bat.x + batHalf;
    const bTop    = bat.y - batHalf;
    const bBottom = bat.y + batHalf;

    if (atkRight > bLeft && atkLeft < bRight && atkBottom > bTop && atkTop < bBottom) {
      bat.alive = false;
    }
  });
}

function drawHeroHitEffect() {
  if (heroInvincible > 0 && Math.floor(heroInvincible / 4) % 2 === 0) {
    const ph = player.hitbox;
    c.save();
    c.globalAlpha = 0.4;
    c.fillStyle = "#FFFFFF";
    c.fillRect(ph.position.x - 5, ph.position.y - 5, ph.width + 10, ph.height + 10);
    c.restore();
  }

  if (heroHP <= 0 && heroInvincible <= 0) {
    heroHP = 3;
    player.position.x = Math.floor((WORLD_WIDTH - 40) / 2);
    player.position.y = WORLD_HEIGHT - 80;
    player.velocity.y = 0;
    player.velocity.x = 0;
    camera.position.y = -(WORLD_HEIGHT - scaledCanvas.height);
  }
}

function drawHPHearts() {
  c.save();
  const startX = 160;
  const y = 14;

  c.fillStyle = "rgba(0,0,0,0.45)";
  _roundRect(c, startX, 10, 14 + heroHP * 18, 30, 8);
  c.fill();

  c.fillStyle = "#FF6666";
  c.font = "bold 11px monospace";
  c.textBaseline = "middle";
  c.fillText("HP", startX + 6, y + 11);

  for (let i = 0; i < 3; i++) {
    const hx = startX + 28 + i * 18;
    const hy = y + 4;
    if (i < heroHP) {
      c.fillStyle = "#EE1111";
      _drawMiniHeart(c, hx, hy, 14);
    } else {
      c.fillStyle = "#444444";
      _drawMiniHeart(c, hx, hy, 14);
    }
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