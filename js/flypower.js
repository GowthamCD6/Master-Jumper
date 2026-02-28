const FLY_DURATION     = 300;
const FLY_COOLDOWN_MAX = 360;
const FLY_RISE_SPEED   = -2.0;
const FLY_SIDE_SPEED   = 2.5;  

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
    const hue   = color ? null : 185 + Math.random() * 55;
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

function _spawnFlyTrail() {
  const ph = player.hitbox;
  const ox = ph.position.x + ph.width  / 2;
  const oy = ph.position.y + ph.height / 2;

  if (Math.random() < 0.5) {
    _flyParticles.push({
      type: "streak",
      x: ox + (Math.random() - 0.5) * 18,
      y: oy + ph.height * 0.3,
      vx: (Math.random() - 0.5) * 0.4,
      vy: 1.2 + Math.random() * 1.8,
      life: 14 + Math.floor(Math.random() * 8),
      maxLife: 22,
      size: 1.5 + Math.random() * 1.0,
      len: 8 + Math.random() * 10,
      hue: 185 + Math.random() * 40,
    });
  }

  const side = Math.random() < 0.5 ? -1 : 1;
  _flyParticles.push({
    type: "spark",
    x: ox + side * (10 + Math.random() * 14),
    y: oy - 2 + (Math.random() - 0.5) * 8,
    vx: side * (0.6 + Math.random() * 1.2),
    vy: -0.4 - Math.random() * 0.8,
    life: 20 + Math.floor(Math.random() * 12),
    maxLife: 32,
    size: 1.2 + Math.random() * 1.8,
    hue: 170 + Math.random() * 60,
  });

  if (Math.random() < 0.22) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 12 + Math.random() * 16;
    _flyParticles.push({
      type: "star",
      x: ox + Math.cos(angle) * dist,
      y: oy + Math.sin(angle) * dist,
      vx: Math.cos(angle) * 0.3,
      vy: -0.5 - Math.random() * 0.5,
      life: 24 + Math.floor(Math.random() * 14),
      maxLife: 38,
      size: 2.0 + Math.random() * 1.5,
      hue: 40 + Math.random() * 40,
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
  if (Math.random() < 0.55) _spawnFlyTrail();

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
      c.fillStyle = p.color ?? `hsl(185,100%,70%)`;
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fill();
    }

    c.restore();
  }
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
  outerGr.addColorStop(0,   `rgba(0,210,255,${0.22 * prog})`);
  outerGr.addColorStop(0.4, `rgba(0,140,220,${0.12 * prog})`);
  outerGr.addColorStop(1,   `rgba(0,40,120,0)`);
  c.fillStyle = outerGr;
  c.beginPath();
  c.arc(hx, hy, outerR, 0, Math.PI * 2);
  c.fill();

  const wingFlapOffset = Math.sin(tick * 0.18) * 6;
  const wingSpread     = 28 + 4 * Math.abs(Math.sin(tick * 0.18));
  const wingAlpha      = (0.55 + 0.20 * Math.sin(tick * 0.12)) * prog;

  for (let side = -1; side <= 1; side += 2) {
    c.save();
    c.globalAlpha = wingAlpha;

    const wgx1 = hx + side * 5;
    const wgx2 = hx + side * wingSpread;
    const wGr  = c.createLinearGradient(wgx1, hy, wgx2, hy - 18);
    wGr.addColorStop(0,   `rgba(120,230,255,0.9)`);
    wGr.addColorStop(0.5, `rgba(60,180,255,0.6)`);
    wGr.addColorStop(1,   `rgba(0,100,220,0)`);
    c.fillStyle   = wGr;
    c.strokeStyle = `rgba(160,240,255,${wingAlpha * 0.7})`;
    c.lineWidth   = 1;

    c.beginPath();
    c.moveTo(hx + side * 6,  hy - 4);
    c.bezierCurveTo(
      hx + side * wingSpread * 0.7,  hy - 18 + wingFlapOffset,
      hx + side * wingSpread,        hy - 10 + wingFlapOffset,
      hx + side * wingSpread * 0.5,  hy + 4
    );
    c.bezierCurveTo(
      hx + side * 20, hy + 8,
      hx + side * 8,  hy + 4,
      hx + side * 6,  hy - 4
    );
    c.fill();
    c.stroke();

    c.globalAlpha = wingAlpha * 0.55;
    c.beginPath();
    c.moveTo(hx + side * 5,  hy + 4);
    c.bezierCurveTo(
      hx + side * wingSpread * 0.65, hy + 14 - wingFlapOffset * 0.5,
      hx + side * wingSpread * 0.8,  hy + 18 - wingFlapOffset * 0.5,
      hx + side * wingSpread * 0.3,  hy + 20
    );
    c.bezierCurveTo(
      hx + side * 10, hy + 16,
      hx + side * 5,  hy + 12,
      hx + side * 5,  hy + 4
    );
    c.fill();

    c.restore();
  }

  c.save();
  const lineCount = 5;
  for (let li = 0; li < lineCount; li++) {
    const phase  = (li / lineCount) * Math.PI * 2 + tick * 0.09;
    const lx     = hx + Math.sin(phase) * 12;
    const lyBase = hy + ph.height * 0.45;
    const len    = 10 + 8 * Math.abs(Math.sin(phase * 0.7));
    const la     = (0.30 + 0.15 * Math.sin(phase)) * prog;
    const lhue   = 190 + li * 10;
    c.globalAlpha = la;
    c.strokeStyle = `hsl(${lhue},100%,75%)`;
    c.lineWidth   = 1.2 - li * 0.12;
    c.lineCap     = "round";
    c.beginPath();
    c.moveTo(lx, lyBase);
    c.lineTo(lx + (Math.random() - 0.5), lyBase + len);
    c.stroke();
  }
  c.restore();

  const orbCount  = 4;
  const orbRadius = 22;
  for (let oi = 0; oi < orbCount; oi++) {
    const orbAngle = _flyAuraAngle * 1.8 + (oi / orbCount) * Math.PI * 2;
    const ox_      = hx + Math.cos(orbAngle) * orbRadius;
    const oy_      = hy + Math.sin(orbAngle) * orbRadius * 0.55;
    const orbHue   = 180 + oi * 22;
    const orbA     = (0.65 + 0.20 * Math.sin(orbAngle * 2)) * prog;
    const orbSize  = 2.5 + 0.8 * Math.sin(orbAngle * 3);

    c.save();
    c.globalAlpha = orbA;
    c.fillStyle   = `hsl(${orbHue},100%,80%)`;
    c.beginPath();
    c.arc(ox_, oy_, orbSize, 0, Math.PI * 2);
    c.fill();
    // Soft halo around orb (one pass, no shadowBlur loop)
    const orbGr = c.createRadialGradient(ox_, oy_, 0, ox_, oy_, orbSize * 3.5);
    orbGr.addColorStop(0,   `hsla(${orbHue},100%,80%,0.35)`);
    orbGr.addColorStop(1,   `hsla(${orbHue},100%,60%,0)`);
    c.fillStyle = orbGr;
    c.beginPath();
    c.arc(ox_, oy_, orbSize * 3.5, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  // ══════════════════════════════════════════════════════════
  //  LAYER 5 – Electric arc flickers (random jagged lines)
  // ══════════════════════════════════════════════════════════
  if (Math.random() < 0.35) {
    c.save();
    const arcSide  = Math.random() < 0.5 ? -1 : 1;
    const arcAngle = Math.random() * Math.PI;
    const arcLen   = 10 + Math.random() * 14;
    const arcSegs  = 5;
    let ax = hx + arcSide * 8;
    let ay = hy + (Math.random() - 0.5) * 10;
    c.strokeStyle = `rgba(180,240,255,${0.55 * prog})`;
    c.lineWidth   = 0.8;
    c.lineCap     = "round";
    c.lineJoin    = "round";
    c.beginPath();
    c.moveTo(ax, ay);
    for (let seg = 0; seg < arcSegs; seg++) {
      ax += arcSide * (arcLen / arcSegs) + (Math.random() - 0.5) * 5;
      ay += (Math.random() - 0.5) * 7;
      c.lineTo(ax, ay);
    }
    c.stroke();
    c.restore();
  }

  // ══════════════════════════════════════════════════════════
  //  LAYER 6 – Pulsing energy core at hero center
  // ══════════════════════════════════════════════════════════
  const coreR  = 5 + 2 * Math.abs(Math.sin(tick * 0.22));
  const coreA  = (0.70 + 0.20 * Math.sin(tick * 0.22)) * prog;
  const coreGr = c.createRadialGradient(hx, hy, 0, hx, hy, coreR * 2.5);
  coreGr.addColorStop(0,   `rgba(255,255,255,${coreA})`);
  coreGr.addColorStop(0.4, `rgba(120,230,255,${coreA * 0.6})`);
  coreGr.addColorStop(1,   `rgba(0,140,255,0)`);
  c.fillStyle = coreGr;
  c.beginPath();
  c.arc(hx, hy, coreR * 2.5, 0, Math.PI * 2);
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

// ── HUD bar (screen-space, outside camera) ───────────────────
function drawFlyPowerHUD() {
  const panW = 155;
  const panH = 26;
  const barW = 84;
  const barH = 7;
  const px   = 10;
  const py   = 70;   // directly below HP panel (py=10, panH=52 → gap at 68)

  const ready  = !flyPowerActive && flyCooldown === 0 && !gameOver;
  const active = flyPowerActive;

  c.save();
  c.textBaseline = "middle";
  c.textAlign    = "left";

  // ── Panel ──────────────────────────────────────────────────
  c.fillStyle = "rgba(0,0,0,0.68)";
  _roundRect(c, px, py, panW, panH, 8);
  c.fill();
  c.strokeStyle = active ? "rgba(0,200,255,0.30)" : "rgba(255,255,255,0.08)";
  c.lineWidth   = 1;
  _roundRect(c, px, py, panW, panH, 8);
  c.stroke();

  // ── "FLY" label ─────────────────────────────────────────────
  c.font      = "bold 9px monospace";
  c.fillStyle = active ? "#00EEFF" : ready ? "#55AACC" : "#3a5566";
  c.fillText("FLY", px + 8, py + 13);

  // ── Bar track ───────────────────────────────────────────────
  const bx  = px + 34;
  const by_ = py + Math.floor((panH - barH) / 2);
  c.fillStyle = "rgba(255,255,255,0.07)";
  _roundRect(c, bx, by_, barW, barH, barH / 2);
  c.fill();

  // ── Bar fill ────────────────────────────────────────────────
  let ratio, fillColor;
  if (active) {
    ratio     = flyPowerTimer / FLY_DURATION;
    const hue = 185 + (1 - ratio) * 55;
    fillColor = `hsl(${hue},100%,60%)`;
    c.shadowColor = `hsl(${hue},100%,65%)`;
    c.shadowBlur  = 6 + 2 * Math.sin(_flyAuraAngle * 3);
  } else if (flyCooldown > 0) {
    ratio     = 1 - flyCooldown / FLY_COOLDOWN_MAX;
    fillColor = "#1a3a4a";
  } else {
    ratio     = 1;
    fillColor = "#00BBFF";
    c.shadowColor = "#00CCFF";
    c.shadowBlur  = 8 + 4 * Math.sin(_flyAuraAngle * 3);
  }

  if (ratio > 0) {
    c.fillStyle = fillColor;
    _roundRect(c, bx, by_, barW * ratio, barH, barH / 2);
    c.fill();
  }
  c.shadowBlur = 0;

  // Active shimmer
  if (active && Math.floor(_flyWingTick / 5) % 2 === 0 && ratio > 0) {
    c.fillStyle = "rgba(180,255,255,0.14)";
    _roundRect(c, bx, by_, barW * ratio, barH, barH / 2);
    c.fill();
  }

  // ── Status text (right of bar) ──────────────────────────────
  const statX = bx + barW + 6;
  c.font      = "bold 8px monospace";
  if (active) {
    c.fillStyle = "#AAFFFF";
    c.fillText(Math.ceil(flyPowerTimer / 60) + "s", statX, py + 13);
  } else if (flyCooldown > 0) {
    c.fillStyle = "#445566";
    c.fillText(Math.ceil(flyCooldown / 60) + "s", statX, py + 13);
  } else {
    c.fillStyle = "rgba(0,200,255,0.80)";
    c.fillText("[F]", statX, py + 13);
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
  c.strokeStyle = active ? "#00FFEE"
                : ready  ? "#0099CC"
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
    c.strokeStyle = "rgba(0,180,220,0.70)";
    c.lineCap     = "round";
    c.beginPath();
    c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
    c.stroke();
  }

  if (active) {
    const ratio = flyPowerTimer / FLY_DURATION;
    const r     = BTN / 2 + 5;
    const hue   = 175 + (1 - ratio) * 45;
    // track
    c.strokeStyle = "rgba(255,255,255,0.06)";
    c.lineWidth   = 4;
    c.lineCap     = "butt";
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    // fill – glow only on the arc ring, far from sprite
    c.shadowColor = `hsl(${hue},100%,60%)`;
    c.shadowBlur  = 6;
    c.strokeStyle = `hsl(${hue},100%,58%)`;
    c.lineCap     = "round";
    c.beginPath();
    c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
    c.stroke();
    c.shadowBlur  = 0;
  }

  if (ready) {
    // subtle pulse ring when ready
    const pulseR = BTN / 2 + 4 + 2 * Math.sin(_flyAuraAngle * 3);
    c.strokeStyle = `rgba(0,200,255,${0.28 + 0.12 * Math.sin(_flyAuraAngle * 3)})`;
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
    c.strokeStyle = "rgba(0,200,255,0.50)";
    c.lineWidth   = 0.8;
    _roundRect(c, kx, ky, kw, kh, 3); c.stroke();
    c.fillStyle    = ready ? "#66DDFF" : "#334455";
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
