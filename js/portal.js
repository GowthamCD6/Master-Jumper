// ============================================================
//  portal.js v4 – Battle Portal System
//
//  v4 fixes:
//   - NO velocity manipulation during "open" state (was making
//     the game feel fast). Suction ONLY during "entering".
//   - Portal visual: ONLY the spinning portal sprite. Removed
//     outer rings, inner rings, energy core, gradient halo.
//   - Proper suction: hero freezes, shrinks, gets pulled to
//     portal centre over ~60 frames before battle screen opens.
//   - Zero shadowBlur anywhere (lag prevention).
// ============================================================

//  Constants 
const PORTAL_TRIGGER_M  = 100;
const PORTAL_WORLD_SIZE = 96;    // bigger portal, equal width & height
const PORTAL_DETECT_R   = 110;
const BATTLE_HOLD_T     = 360;

//  Assets 
// Pre-render portal.png (6400x6400!) to a tiny offscreen canvas
// so we never rotate the massive source image every frame.
const _PORTAL_CACHE_SZ   = 192;  // rendered cache size in px (must be square)
const _portalCache       = document.createElement("canvas");
_portalCache.width       = _PORTAL_CACHE_SZ;
_portalCache.height      = _PORTAL_CACHE_SZ;
const _portalCacheCtx    = _portalCache.getContext("2d");
let   _portalSpriteRdy   = false;

const _portalSpriteImg   = new Image();
_portalSpriteImg.onload  = () => {
  _portalCacheCtx.clearRect(0, 0, _PORTAL_CACHE_SZ, _PORTAL_CACHE_SZ);
  _portalCacheCtx.drawImage(_portalSpriteImg, 0, 0, _PORTAL_CACHE_SZ, _PORTAL_CACHE_SZ);
  _portalSpriteRdy = true;
};
_portalSpriteImg.onerror = () => { console.warn("portal.png failed to load"); };
_portalSpriteImg.src     = "./assets/img/portal.png";

const _heroPortrait    = new Image();
let   _heroPortraitRdy = false;
_heroPortrait.onload  = () => { _heroPortraitRdy = true; };
_heroPortrait.onerror = () => { console.warn("Idle.png failed for battle"); };
_heroPortrait.src     = "./assets/img/warrior/Idle.png";

//  DOM overlay (full-screen GIF for battle) 
const _battleOverlay = document.createElement("div");
Object.assign(_battleOverlay.style, {
  position:      "fixed",
  inset:         "0",
  width:         "100vw",
  height:        "100vh",
  zIndex:        "999",
  opacity:       "0",
  pointerEvents: "none",
  overflow:      "hidden",
  background:    "#000",
  clipPath:      "circle(0% at 50% 50%)",
});

const _battleGifImg = document.createElement("img");
_battleGifImg.src   = "./assets/video/BattleGround.gif";
Object.assign(_battleGifImg.style, {
  width:     "100%",
  height:    "100%",
  objectFit: "cover",
  display:   "block",
});

_battleOverlay.appendChild(_battleGifImg);
document.body.appendChild(_battleOverlay);

//  Overlay helpers 
function _setOverlay(opacity) {
  _battleOverlay.style.opacity       = String(Math.max(0, Math.min(1, opacity)));
  _battleOverlay.style.pointerEvents = opacity > 0.01 ? "auto" : "none";
}

function _irisReveal() {
  _battleOverlay.style.transition    = "none";
  _battleOverlay.style.clipPath      = "circle(0% at 50% 50%)";
  _battleOverlay.style.opacity       = "1";
  _battleOverlay.style.pointerEvents = "auto";
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      _battleOverlay.style.transition =
        "clip-path 1.2s cubic-bezier(0.22, 1, 0.36, 1)";
      _battleOverlay.style.clipPath  = "circle(150% at 50% 50%)";
    });
  });
}

function _irisDismiss() {
  _battleOverlay.style.transition =
    "clip-path 0.55s ease-in, opacity 0.55s ease-in";
  _battleOverlay.style.clipPath = "circle(0% at 50% 50%)";
  _battleOverlay.style.opacity  = "0";
}

//  State 
//  waiting    below 100 m
//  opening    50-frame scale-up
//  open       spinning, watching hero (NO velocity changes)
//  entering   hero frozen + sucked to centre + shrinks
//  battle     iris open, canvas UI
//  dismissed  iris closing
//  done       consumed
let _portalState   = "waiting";
let _portalTick    = 0;
let _portalGlobalT = 0;
let _portalWX      = 0;
let _portalWY      = 0;
let _portalScale   = 0;
let _portalSpin    = 0;

// Suction state: hero's frozen position during suck-in
let _suckStartX  = 0;
let _suckStartY  = 0;
let _heroSavedVx = 0;
let _heroSavedVy = 0;

let portalInBattle = false;

//  Rounded-rect helper 
function _portalRR(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x,     y,     x + r, y,          r);
  ctx.closePath();
}

//  Init 
function _initPortal() {
  _portalWX    = WORLD_WIDTH / 2;
  _portalWY    = player.position.y - 100;
  _portalState = "opening";
  _portalTick  = 0;
  _portalScale = 0;
  _portalSpin  = 0;
}

function _checkTrigger() {
  var h = Math.max(0, Math.floor((WORLD_HEIGHT - player.position.y) / 16));
  if (h >= PORTAL_TRIGGER_M) _initPortal();
}

//  Hero inside test 
function _heroInsidePortal() {
  var ph  = player.hitbox;
  var phX = ph.position.x + ph.width  / 2;
  var phY = ph.position.y + ph.height / 2;
  var dx  = phX - _portalWX;
  var dy  = phY - _portalWY;
  return Math.sqrt(dx * dx + dy * dy) < PORTAL_DETECT_R * 0.55;
}

//  Arrow pointing toward portal 
function _drawArrow() {
  var ph   = player.hitbox;
  var phX  = ph.position.x + ph.width  / 2;
  var phY  = ph.position.y + ph.height / 2;
  var dx   = _portalWX - phX;
  var dy   = _portalWY - phY;
  var dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 30 || dist > 300) return;

  var angle = Math.atan2(dy, dx);
  var hue   = (200 + _portalGlobalT * 2) % 360;
  var alpha = Math.min(1, (dist - 30) / 80) * 0.80;

  c.save();
  c.globalAlpha = alpha;
  c.translate(phX + Math.cos(angle) * 26, phY + Math.sin(angle) * 26);
  c.rotate(angle);
  c.fillStyle = "hsl(" + hue + ", 100%, 80%)";
  c.beginPath();
  c.moveTo(10, 0); c.lineTo(-5, -5); c.lineTo(-5, 5);
  c.closePath();
  c.fill();
  c.restore();
}

//  PORTAL GATE 
//    ONLY the spinning sprite. Nothing else around it.
function _drawPortalGate() {
  var bobY = Math.sin(_portalGlobalT * 0.05) * 3;
  var px   = _portalWX;
  var py   = _portalWY + bobY;

  c.save();
  c.translate(px, py);
  c.scale(_portalScale, _portalScale);

  // Spin the portal — faster during entering
  var spinSpeed = _portalState === "entering"
    ? 0.10 + _portalTick * 0.006
    : 0.03;
  _portalSpin += spinSpeed;
  c.rotate(_portalSpin);

  if (_portalSpriteRdy) {
    var s = PORTAL_WORLD_SIZE;
    c.drawImage(_portalCache, -s / 2, -s / 2, s, s);
  } else {
    // Simple fallback: colored disc
    var hue = (200 + _portalGlobalT * 2) % 360;
    c.fillStyle = "hsl(" + hue + ", 80%, 60%)";
    c.beginPath();
    c.arc(0, 0, PORTAL_WORLD_SIZE * 0.36, 0, Math.PI * 2);
    c.fill();
  }

  // "[ ENTER ]" label when hero is nearby (only in "open" state)
  if (_portalState === "open") {
    var ph   = player.hitbox;
    var hDst = Math.sqrt(
      Math.pow(ph.position.x + ph.width / 2 - px, 2) +
      Math.pow(ph.position.y + ph.height / 2 - py, 2)
    );
    if (hDst < PORTAL_DETECT_R * 1.4) {
      c.rotate(-_portalSpin);
      c.scale(1 / _portalScale, 1 / _portalScale);
      var la = Math.min(1, (PORTAL_DETECT_R * 1.4 - hDst) / 40);
      c.globalAlpha  = la;
      c.font         = "bold 8px monospace";
      c.textAlign    = "center";
      c.textBaseline = "bottom";
      c.fillStyle    = "#FFFFFF";
      c.fillText("[ ENTER ]", 0, -PORTAL_WORLD_SIZE * 0.72);
    }
  }

  c.restore();
}

//  HERO SUCK-IN ANIMATION (during "entering") 
//    Hero is frozen in place. We lerp position toward portal
//    centre and shrink the hero over 60 frames, then snap into
//    the battle screen.
function _drawSuckIn() {
  var t      = _portalTick;
  var ratio  = Math.min(1, t / 55);  // 01 over 55 frames
  var ease   = ratio * ratio * (3 - 2 * ratio);  // smoothstep

  // Lerp hero position toward portal
  var targetX = _portalWX - player.width / 2;
  var targetY = _portalWY - player.height / 2;
  player.position.x = _suckStartX + (_portalWX - player.width / 2 - _suckStartX) * ease;
  player.position.y = _suckStartY + (_portalWY - player.height / 2 - _suckStartY) * ease;
  player.velocity.x = 0;
  player.velocity.y = 0;

  // Draw hero shrinking (scale the player sprite)
  var shrink = 1 - ease * 0.85;  // 1.0  0.15
  if (shrink > 0.05) {
    var heroMidX = player.position.x + player.width / 2;
    var heroMidY = player.position.y + player.height / 2;
    c.save();
    c.translate(heroMidX, heroMidY);
    c.scale(shrink, shrink);
    // Rotate hero as it gets sucked in
    c.rotate(t * 0.12);
    c.translate(-player.width / 2, -player.height / 2);
    // Draw the player image at 0,0 (we've translated to correct spot)
    if (player.image) {
      var fw = player.image.width / player.frameRate;
      var fh = player.image.height;
      c.drawImage(
        player.image,
        player.currentFrame * fw, 0, fw, fh,
        0, 0, player.width, player.height
      );
    }
    c.restore();
  }
}

//  Battle Canvas UI 
function _drawBattleCanvasUI() {
  var W  = canvas.width;
  var H  = canvas.height;
  var cx = W / 2;
  var cy = H / 2;
  var t  = _portalTick;

  // Clear canvas to transparent so GIF shows through
  c.clearRect(0, 0, W, H);

  c.save();

  // Brief dark fade at start
  if (t < 60) {
    var fade = Math.max(0, 1 - t / 60);
    c.fillStyle = "rgba(0, 0, 0, " + fade + ")";
    c.fillRect(0, 0, W, H);
  }

  // Subtle vignette for readability
  var vig = c.createRadialGradient(cx, cy, H * 0.08, cx, cy, H * 0.72);
  vig.addColorStop(0, "rgba(0,0,0,0.04)");
  vig.addColorStop(1, "rgba(0,0,0,0.50)");
  c.fillStyle = vig;
  c.fillRect(0, 0, W, H);

  //  Title 
  if (t > 14) {
    var ta = Math.min(1, (t - 14) / 20);
    var ps = 1 + 0.012 * Math.sin(t * 0.07);
    c.save();
    c.globalAlpha = ta;
    c.translate(cx, cy - 115);
    c.scale(ps, ps);
    c.font         = "bold 46px monospace";
    c.textAlign    = "center";
    c.textBaseline = "middle";
    c.fillStyle    = "rgba(0,0,0,0.75)";
    c.fillText("BATTLE PORTAL", 2, 3);
    var tg = c.createLinearGradient(-145, -22, 145, 22);
    tg.addColorStop(0,   "#CC88FF");
    tg.addColorStop(0.4, "#9922FF");
    tg.addColorStop(0.7, "#6600CC");
    tg.addColorStop(1,   "#330088");
    c.fillStyle = tg;
    c.fillText("BATTLE PORTAL", 0, 0);
    c.restore();
  }

  //  Crossed swords 
  if (t > 10) {
    var sa = Math.min(1, (t - 10) / 14);
    c.save();
    c.globalAlpha  = sa;
    c.font         = "28px serif";
    c.textAlign    = "center";
    c.textBaseline = "middle";
    c.fillStyle    = "#BB44FF";
    c.fillText("\u2694\uFE0F", cx - 78, cy - 115);
    c.fillText("\u2694\uFE0F", cx + 78, cy - 115);
    c.restore();
  }

  //  Hero standing in the battle world 
  if (t > 18 && _heroPortraitRdy) {
    var pa     = Math.min(1, (t - 18) / 22);
    var frameW = _heroPortrait.width  / 8;
    var frameH = _heroPortrait.height;
    var frame  = Math.floor((_portalGlobalT / 5) % 8);
    var hScale = 3.5;
    var dw     = frameW * hScale;
    var dh     = frameH * hScale;
    var hX     = cx - dw / 2;
    var hY     = H - dh - 22;

    c.save();
    c.globalAlpha = pa;
    // Ground shadow
    c.fillStyle = "rgba(0, 0, 0, 0.35)";
    c.beginPath();
    c.ellipse(cx, H - 19, dw * 0.36, 6, 0, 0, Math.PI * 2);
    c.fill();
    // Purple ambient glow
    c.fillStyle = "rgba(140, 60, 255, 0.22)";
    c.beginPath();
    c.ellipse(cx, hY + dh * 0.55, dw * 0.5, dh * 0.4, 0, 0, Math.PI * 2);
    c.fill();
    // Sprite
    c.drawImage(
      _heroPortrait,
      frame * frameW, 0, frameW, frameH,
      hX, hY, dw, dh
    );
    c.restore();
  } else if (t > 18) {
    // Fallback silhouette
    c.save();
    c.globalAlpha = Math.min(1, (t - 18) / 22);
    c.fillStyle   = "#9944FF";
    c.fillRect(cx - 25, H - 102, 50, 80);
    c.font      = "10px monospace";
    c.fillStyle = "#FFF";
    c.textAlign = "center";
    c.fillText("HERO", cx, H - 55);
    c.restore();
  }

  //  Stats card 
  if (t > 45) {
    var sa2 = Math.min(1, (t - 45) / 18);
    var heightClimb = Math.max(0, Math.floor((WORLD_HEIGHT - highestY) / 16));
    var cW = 240, cH = 108, cX = cx - 120, cY = cy - 15;

    c.save();
    c.globalAlpha = sa2;
    c.fillStyle   = "rgba(6, 0, 22, 0.88)";
    _portalRR(c, cX, cY, cW, cH, 10);
    c.fill();
    c.strokeStyle = "rgba(140, 50, 255, 0.65)";
    c.lineWidth   = 1.5;
    _portalRR(c, cX, cY, cW, cH, 10);
    c.stroke();

    c.font         = "10px monospace";
    c.fillStyle    = "rgba(180, 130, 255, 0.75)";
    c.textAlign    = "center";
    c.textBaseline = "middle";
    c.fillText("\u2014 YOU HAVE ENTERED THE BATTLE REALM \u2014", cx, cY + 18);

    c.strokeStyle = "rgba(140, 50, 255, 0.28)";
    c.lineWidth   = 1;
    c.beginPath();
    c.moveTo(cX + 14, cY + 30);
    c.lineTo(cX + cW - 14, cY + 30);
    c.stroke();

    var rows = [
      { icon: "\u2B06",       label: "Height", value: heightClimb + " m", color: "#88CCFF" },
      { icon: "\uD83E\uDE99", label: "Coins",  value: String(coinScore),  color: "#FFD700" },
      { icon: "\uD83D\uDC80", label: "Kills",  value: String(batsKilled), color: "#FF7766" },
    ];
    rows.forEach(function (row, i) {
      var ry = cY + 52 + i * 22;
      c.font      = "12px monospace";
      c.fillStyle = "rgba(210, 190, 255, 0.65)";
      c.textAlign = "left";
      c.fillText(row.icon + "  " + row.label, cX + 18, ry);
      c.font      = "bold 12px monospace";
      c.fillStyle = row.color;
      c.textAlign = "right";
      c.fillText(row.value, cX + cW - 18, ry);
    });
    c.restore();
  }

  //  Dismiss prompt 
  if (t > 85) {
    var ba = Math.max(0, Math.sin(t * 0.09))
           * Math.min(1, (t - 85) / 18) * 0.90;
    c.save();
    c.globalAlpha  = ba;
    c.font         = "bold 13px monospace";
    c.textAlign    = "center";
    c.textBaseline = "middle";
    c.fillStyle    = "#FFFFFF";
    c.fillText("\u2014 Press any key to return \u2014", cx, cy + 125);
    c.restore();
  }

  c.restore();
}

//  Dismiss handler 
let _dismissAttached = false;
function _attachDismiss() {
  if (_dismissAttached) return;
  _dismissAttached = true;
  var handler = function () {
    if (_portalState !== "battle") return;
    if (_portalTick < 85) return;
    _portalState   = "dismissed";
    _portalTick    = 0;
    portalInBattle = false;
    _irisDismiss();
    window.removeEventListener("keydown",     handler);
    canvas.removeEventListener("pointerdown", handler);
    _dismissAttached = false;
  };
  window.addEventListener("keydown",     handler);
  canvas.addEventListener("pointerdown", handler);
}

// ============================================================
//  PUBLIC API
// ============================================================

function updatePortal() {
  _portalGlobalT++;

  switch (_portalState) {

    case "waiting":
      _checkTrigger();
      break;

    case "opening":
      _portalTick++;
      _portalScale = Math.min(1, _portalTick / 50);
      _drawPortalGate();
      if (_portalTick >= 50) {
        _portalState = "open";
        _portalTick  = 0;
      }
      break;

    case "open":
      _drawPortalGate();
      _drawArrow();
      // NO velocity changes here — game speed stays normal
      if (_heroInsidePortal()) {
        _portalState  = "entering";
        _portalTick   = 0;
        // Save hero position for lerp
        _suckStartX   = player.position.x;
        _suckStartY   = player.position.y;
        _heroSavedVx  = player.velocity.x;
        _heroSavedVy  = player.velocity.y;
        _attachDismiss();
      }
      break;

    case "entering":
      _portalTick++;
      // Make hero invulnerable while being sucked in
      heroInvincible = 999;
      // Freeze hero controls — portal handles movement
      player.velocity.x = 0;
      player.velocity.y = 0;
      // Draw portal spinning faster
      _drawPortalGate();
      // Draw hero being sucked in (shrink + pull to centre)
      _drawSuckIn();
      // After suck completes, open battle
      if (_portalTick >= 60) {
        _portalState   = "battle";
        _portalTick    = 0;
        portalInBattle = true;
        // Restore hero position (don't leave them at portal centre)
        player.position.x = _suckStartX;
        player.position.y = _suckStartY;
        player.velocity.x = 0;
        player.velocity.y = 0;
        // Elevate canvas above overlay
        canvas.style.position = "relative";
        canvas.style.zIndex   = "1001";
        _irisReveal();
      }
      break;

    case "battle":
      _portalTick++;
      // Keep hero invulnerable during battle
      heroInvincible = 999;
      if (_portalTick >= BATTLE_HOLD_T) {
        _portalState   = "dismissed";
        _portalTick    = 0;
        portalInBattle = false;
        _irisDismiss();
      }
      break;

    case "dismissed":
      // Still invulnerable during dismiss animation
      heroInvincible = 999;
      break;

    case "done":
      // Restore normal invincibility when portal is fully done
      if (heroInvincible > 100) heroInvincible = 0;
      break;
  }
}

function drawPortalFlash() {
  switch (_portalState) {

    case "entering": {
      // Mild purple flash while hero is being absorbed
      var a = Math.max(0, 0.40 - (_portalTick / 60) * 0.40);
      if (a > 0) {
        c.save();
        c.fillStyle = "rgba(160, 80, 255, " + a + ")";
        c.fillRect(0, 0, canvas.width, canvas.height);
        c.restore();
      }
      break;
    }

    case "battle":
      _drawBattleCanvasUI();
      break;

    case "dismissed": {
      _portalTick++;
      _drawBattleCanvasUI();
      if (_portalTick >= 36) {
        _setOverlay(0);
        _battleOverlay.style.clipPath   = "circle(0% at 50% 50%)";
        _battleOverlay.style.transition = "none";
        canvas.style.position = "";
        canvas.style.zIndex   = "";
        _portalState = "done";
      }
      break;
    }
  }
}