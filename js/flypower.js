const FLY_DURATION     = 600;  // 10 seconds at 60 fps
const FLY_COOLDOWN_MAX = 360;
const FLY_RISE_SPEED   = -2.0;

const FLY_SX = 64, FLY_SY = 65, FLY_SW = 22, FLY_SH = 23;

let flyPowerActive = false;
let flyPowerTimer  = 0;
let flyCooldown    = 0;  

let _flyAuraAngle  = 0;
let _flyWingTick   = 0;
let _flyParticles  = [];
let _flyBtnReady   = false;

const _flyBirdImg    = new Image();
let   _flyBirdLoaded = false;
_flyBirdImg.onload   = () => { _flyBirdLoaded = true; };
_flyBirdImg.onerror  = () => {
  const _fb2 = new Image();
  _fb2.onload = () => { _flyBirdImg.src = _fb2.src; _flyBirdLoaded = true; };
  _fb2.src = "./imgs/flappybirdassets(1).png";
};
_flyBirdImg.src = "./img/warrior/powers.png";

function activateFlyPower() {
  if (flyPowerActive || flyCooldown > 0 || gameOver) return;
  flyPowerActive = true;
  flyPowerTimer  = FLY_DURATION;
  _flyWingTick   = 0;
  _flyAuraAngle  = 0;
  _spawnFlyBurst();
}

function _deactivateFlyPower() {
  flyPowerActive = false;
  flyCooldown    = FLY_COOLDOWN_MAX;
  _spawnFlyBurst(8, "#88BBDD");
}

function _spawnFlyBurst(count = 24, color = null) {
  const ph = player.hitbox;
  const ox = ph.position.x + ph.width  / 2;
  const oy = ph.position.y + ph.height / 2;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const spd   = 1.2 + Math.random() * 2.5;
    const hue   = color ? null : 35 + Math.random() * 16;  // golden amber
    _flyParticles.push({
      x: ox, y: oy,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 0.4,
      life:    35 + Math.floor(Math.random() * 20),
      maxLife: 55,
      size:    2 + Math.random() * 3,
      color:   color ?? `hsl(${hue}, 100%, 70%)`,
    });
  }
}

function updateFlyPower() {
  if (!flyPowerActive) {
    if (flyCooldown > 0) flyCooldown--;
    _updateFlyParticles();
    return;
  }

  flyPowerTimer--;
  if (flyPowerTimer <= 0) {
    _deactivateFlyPower();
    _updateFlyParticles();
    return;
  }

  player.velocity.y = FLY_RISE_SPEED;
  if (player.velocity.y < FLY_RISE_SPEED) player.velocity.y = FLY_RISE_SPEED;

  player.shouldPanCameraDown({ camera, canvas });

  _flyAuraAngle += 0.055;
  _flyWingTick++;

  _updateFlyParticles();
}

function _updateFlyParticles() {
  for (let i = _flyParticles.length - 1; i >= 0; i--) {
    const p = _flyParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) _flyParticles.splice(i, 1);
  }
}

function _tickFlyParticles() {
  for (let i = _flyParticles.length - 1; i >= 0; i--) {
    const p = _flyParticles[i];
    if (p.life <= 0) continue;

    const a = p.life / p.maxLife;
    c.save();
    c.globalAlpha = a;

    if (p.type === "streak") {
      c.strokeStyle = `hsl(${p.hue},100%,75%)`;
      c.lineWidth   = p.size;
      c.lineCap     = "round";
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.lineTo(p.x + p.vx * 2, p.y + p.len);
      c.stroke();

    } else if (p.type === "spark") {
      c.fillStyle = `hsl(${p.hue},100%,78%)`;
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fill();

    } else if (p.type === "star") {
      const s = p.size;
      c.fillStyle = `hsl(${p.hue},100%,85%)`;
      c.beginPath();
      for (let pt = 0; pt < 4; pt++) {
        const ang  = (pt / 4) * Math.PI * 2;
        const angH = ang + Math.PI / 4;
        const r1   = s * 1.8, r2 = s * 0.55;
        if (pt === 0) c.moveTo(p.x + Math.cos(ang) * r1, p.y + Math.sin(ang) * r1);
        else          c.lineTo(p.x + Math.cos(ang) * r1, p.y + Math.sin(ang) * r1);
        c.lineTo(p.x + Math.cos(angH) * r2, p.y + Math.sin(angH) * r2);
      }
      c.closePath();
      c.fill();

    } else {
      c.fillStyle = p.color ?? `hsl(38,100%,65%)`;
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fill();
    }

    c.restore();
  }
}

// ── king.wings1.png frame data ─────────────────────────────────
// 3 source frames (from CSS sprite offsets)
const _KING_WING_FRAMES = [
  { sx:  50, sy:  20, sw: 307, sh: 181 }, // 0 – open   (wings fully spread)
  { sx:  66, sy: 215, sw: 275, sh: 144 }, // 1 – middle (wings horizontal)
  { sx: 101, sy: 387, sw: 206, sh: 139 }, // 2 – bottom (wings folded down)
];
// Natural flap cycle: open → middle → closed → middle → (repeat)
const _KING_WING_SEQ = [0, 1, 2, 1];
const _KING_WING_BUF = 10; // ticks per frame (~6 beats/sec at 60 fps)

const _kingWingsImg    = new Image();
let   _kingWingsLoaded = false;
_kingWingsImg.onload   = () => { _kingWingsLoaded = true; };
_kingWingsImg.src      = "./img/warrior/king.wings1.png";

// ─────────────────────────────────────────────────────────────
//  drawWingSprites()
//  The game hero is hidden during flight (Player.draw() returns early).
//  This function draws the COMPLETE king.wings.png frame (king + wings)
//  at exactly player.height, at the same origin as the normal hero,
//  so it looks identical in size and position. Wings extend naturally
//  to the sides. Mirrors for left-facing direction.
// ─────────────────────────────────────────────────────────────
function drawWingSprites() {
  if (!flyPowerActive || !_kingWingsLoaded) return;

  const seqIdx = Math.floor(_flyWingTick / _KING_WING_BUF) % _KING_WING_SEQ.length;
  const frame  = _KING_WING_FRAMES[_KING_WING_SEQ[seqIdx]];

  // Use the hitbox (the real body) as anchor – avoids sprite-sheet padding bloat.
  // dh is tuned so the king figure inside king.wings.png matches the normal hero.
  const hb = player.hitbox;
  const dh = hb.height * 1.2;          // ~90 px – same visual height as the hero
  const dw = (frame.sw / frame.sh) * dh;

  // Centre horizontally on the hitbox; vertically centred on the hitbox
  const cx = hb.position.x + hb.width  / 2;
  const cy = hb.position.y + hb.height / 2 - dh / 2;

  // Fade out over the last 60 frames
  const wingAlpha = flyPowerTimer <= 60 ? flyPowerTimer / 60 : 1.0;

  c.save();
  c.globalAlpha = wingAlpha;

  if (player.lastDirection === "left") {
    c.translate(cx, cy);
    c.scale(-1, 1);
    c.drawImage(_kingWingsImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -dw / 2, 0, dw, dh);
  } else {
    c.drawImage(_kingWingsImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      cx - dw / 2, cy, dw, dh);
  }

  c.restore();
}

function drawFlyPowerEffects() {
  if (!flyPowerActive && _flyParticles.length === 0) return;

  _tickFlyParticles();

  if (!flyPowerActive) return;

  const ph   = player.hitbox;
  const hx   = ph.position.x + ph.width  / 2;
  const hy   = ph.position.y + ph.height / 2;
  const prog = flyPowerTimer / FLY_DURATION;
  const tick = _flyWingTick;

  c.save();

  const outerR  = 48 + 4 * Math.sin(tick * 0.07);
  const outerGr = c.createRadialGradient(hx, hy, 4, hx, hy, outerR);
  outerGr.addColorStop(0,   `rgba(255, 180, 30, ${0.28 * prog})`);
  outerGr.addColorStop(0.4, `rgba(200, 100, 10, ${0.15 * prog})`);
  outerGr.addColorStop(1,   `rgba(80, 20, 0, 0)`);
  c.fillStyle = outerGr;
  c.beginPath();
  c.arc(hx, hy, outerR, 0, Math.PI * 2);
  c.fill();

  // ══════════════════════════════════════════════════════════
  //  LAYER 7 – Last-2-sec urgency red pulse
  // ══════════════════════════════════════════════════════════
  if (flyPowerTimer < 120) {
    const t      = flyPowerTimer / 120;   // 1→0
    const pulseA = (1 - t) * 0.22 * Math.abs(Math.sin(tick * 0.25));
    const urgGr  = c.createRadialGradient(hx, hy, 0, hx, hy, 36);
    urgGr.addColorStop(0, `rgba(255,60,60,${pulseA})`);
    urgGr.addColorStop(1, `rgba(200,0,0,0)`);
    c.fillStyle = urgGr;
    c.beginPath();
    c.arc(hx, hy, 36, 0, Math.PI * 2);
     c.fill();
  }

  c.restore();
}

// ── On-screen test button (center-bottom) ───────────────────
// ── Helper: canvas-drawn bird silhouette (fallback when image missing) ─
function _drawBirdShape(ctx, x, y, w, h, flapY) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(1, flapY);

  // Body
  ctx.fillStyle = "#FFD700";
  ctx.beginPath();
  ctx.ellipse(0, 2, w * 0.38, h * 0.30, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing top
  ctx.fillStyle = "#FFA500";
  ctx.beginPath();
  ctx.ellipse(-2, -2, w * 0.42, h * 0.18, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Wing bottom
  ctx.fillStyle = "#FF8C00";
  ctx.beginPath();
  ctx.ellipse(-2, 6, w * 0.38, h * 0.14, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(w * 0.22, -1, w * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(w * 0.23, -1.4, w * 0.03, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = "#FF6600";
  ctx.beginPath();
  ctx.moveTo(w * 0.36, 2);
  ctx.lineTo(w * 0.52, 0);
  ctx.lineTo(w * 0.36, 5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawFlyButton() {
  // Button size & bottom-right position
  const BTN  = 64;                              // hit-area square
  const PAD  = 14;
  const bx   = canvas.width  - BTN - PAD;
  const by   = canvas.height - BTN - PAD;
  const cx   = bx + BTN / 2;
  const cy   = by + BTN / 2;

  const ready  = !flyPowerActive && flyCooldown === 0 && !gameOver;
  const active = flyPowerActive;

  c.save();

  // ── Wing-flap scale (no shadow set here – avoids blob) ───
  const flapY = active
    ? 0.60 + 0.40 * Math.abs(Math.sin(_flyWingTick * 0.42))
    : ready
      ? 0.88 + 0.12 * Math.sin(_flyWingTick * 0.10)
      : 1;

  // ── Step 1: dark circle background ───────────────────────
  c.fillStyle = active  ? "rgba(0,30,40,0.80)"
              : ready   ? "rgba(0,20,35,0.70)"
              :            "rgba(10,15,20,0.60)";
  c.beginPath();
  c.arc(cx, cy, BTN / 2, 0, Math.PI * 2);
  c.fill();

  // ── Step 2: sprite clipped to circle (NO shadowBlur here) ─
  c.save();
  c.beginPath();
  c.arc(cx, cy, BTN / 2 - 2, 0, Math.PI * 2);
  c.clip();

  if (!active && !ready) c.filter = "grayscale(80%) brightness(0.45)";

  const SPR_W = BTN * 0.80;
  const SPR_H = BTN * 0.80;
  const sx    = cx - SPR_W / 2;
  const sy_   = cy - SPR_H / 2;

  if (_flyBirdLoaded) {
    c.save();
    c.translate(cx, cy);
    c.scale(1, flapY);
    c.drawImage(_flyBirdImg, FLY_SX, FLY_SY, FLY_SW, FLY_SH,
      -SPR_W / 2, -SPR_H / 2, SPR_W, SPR_H);
    c.restore();
  } else {
    _drawBirdShape(c, sx, sy_, SPR_W, SPR_H, flapY);
  }

  c.filter = "none";
  c.restore(); // end clip

  // ── Step 3: clean circle border ──────────────────────────
  c.strokeStyle = active ? "#FFD700"
                : ready  ? "#CC8800"
                :           "#1e3a4a";
  c.lineWidth   = active ? 2.5 : 1.5;
  c.beginPath();
  c.arc(cx, cy, BTN / 2, 0, Math.PI * 2);
  c.stroke();

  // ── Step 4: arc ring outside circle (glow only here) ─────
  if (flyCooldown > 0) {
    const ratio = 1 - flyCooldown / FLY_COOLDOWN_MAX;
    const r     = BTN / 2 + 5;
    // track
    c.strokeStyle = "rgba(255,255,255,0.06)";
    c.lineWidth   = 4;
    c.lineCap     = "butt";
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    // fill
    c.strokeStyle = "rgba(255,160,0,0.75)";
    c.lineCap     = "round";
    c.beginPath();
    c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
    c.stroke();
  }

  if (active) {
    const ratio = flyPowerTimer / FLY_DURATION;
    const r     = BTN / 2 + 5;
    const hue   = 44 + (1 - ratio) * 8;
    // track
    c.strokeStyle = "rgba(255,255,255,0.06)";
    c.lineWidth   = 4;
    c.lineCap     = "butt";
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    // fill – glow only on the arc ring, far from sprite
    c.shadowColor = `hsl(${hue},100%,55%)`;
    c.shadowBlur  = 6;
    c.strokeStyle = `hsl(${hue},100%,52%)`;
    c.lineCap     = "round";
    c.beginPath();
    c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
    c.stroke();
    c.shadowBlur  = 0;
  }

  if (ready) {
    // subtle pulse ring when ready
    const pulseR = BTN / 2 + 4 + 2 * Math.sin(_flyAuraAngle * 3);
    c.strokeStyle = `rgba(255, 180, 0, ${0.28 + 0.12 * Math.sin(_flyAuraAngle * 3)})`;
    c.lineWidth   = 1.5;
    c.lineCap     = "butt";
    c.beginPath();
    c.arc(cx, cy, pulseR, 0, Math.PI * 2);
    c.stroke();
  }

  // ── Step 5: [F] key badge – top-left corner ───────────────
  if (!active) {
    const kw = 16, kh = 12;
    const kx = bx + 2, ky = by + 2;
    c.fillStyle   = "rgba(0,0,0,0.60)";
    _roundRect(c, kx, ky, kw, kh, 3); c.fill();
    c.strokeStyle = "rgba(200,150,0,0.55)";
    c.lineWidth   = 0.8;
    _roundRect(c, kx, ky, kw, kh, 3); c.stroke();
    c.fillStyle   = ready ? "#FFCC44" : "#334455";
    c.font         = "bold 8px monospace";
    c.textAlign    = "center";
    c.textBaseline = "middle";
    c.fillText("F", kx + kw / 2, ky + kh / 2);
  }

  c.restore();

  // ── Pointer hit-test ────────────────────────────────────
  if (!_flyBtnReady) {
    _flyBtnReady = true;
    canvas.addEventListener("pointerdown", (e) => {
      const rect = canvas.getBoundingClientRect();
      const scx  = canvas.width  / rect.width;
      const scy  = canvas.height / rect.height;
      const mx   = (e.clientX - rect.left) * scx;
      const my   = (e.clientY - rect.top)  * scy;
      const dx   = mx - cx, dy = my - cy;
      if (dx * dx + dy * dy <= (BTN / 2) * (BTN / 2)) activateFlyPower();
    });
  }
}

// ── Keyboard shortcut  [F] ───────────────────────────────────
window.addEventListener("keydown", (e) => {
  if (e.key === "f" || e.key === "F") activateFlyPower();
});
