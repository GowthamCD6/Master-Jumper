let coinScore  = 0;

function _cRng(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const _crng = _cRng(137);

const collectibles = [];
const COIN_SZ = 14;

function _spawn(x, y, type) {
  collectibles.push(new Collectible({ position: { x, y }, type }));
}

const ARC_COINS = 5;

for (let i = 0; i < platformGroups.length - 1; i++) {
  const A = platformGroups[i];
  const B = platformGroups[i + 1];

  const ax = A.x + A.width / 2;
  const ay = A.y;
  const bx = B.x + B.width / 2;
  const by = B.y;
  const dx = bx - ax;
  const vertGap = Math.abs(by - ay);

  if (Math.abs(dx) > 220) continue;
  if (vertGap < 16) continue;

  const roll = _crng();
  if (roll < 0.05) continue;
  const isHeartArc = roll > 0.92;

  const higherY  = Math.min(ay, by);
  const peakLift = 36;
  const arcPeak  = (ay + by) / 2 - (higherY - peakLift);

  if (isHeartArc) {
    const hx = ax + 0.5 * dx - COIN_SZ / 2;
    const hy = (ay + by) / 2 - arcPeak - COIN_SZ / 2;
    if (hx >= 0 && hx + COIN_SZ <= WORLD_WIDTH && hy >= 0) {
      _spawn(hx, hy, "heart");
    }
  } else {
    for (let ci = 0; ci < ARC_COINS; ci++) {
      const t  = (ci + 1) / (ARC_COINS + 1);
      const cx = ax + t * dx - COIN_SZ / 2;
      const cy = ay + t * (by - ay) - arcPeak * Math.sin(Math.PI * t) - COIN_SZ / 2;
      if (cx < 0 || cx + COIN_SZ > WORLD_WIDTH) continue;
      if (cy < 0) continue;
      _spawn(cx, cy, "coin");
    }
  }
}

platformGroups.forEach((plat, idx) => {
  if (idx === 0) return;
  const roll = _crng();
  if (roll < 0.55) return;

  const onY = plat.y - COIN_SZ - 2;

  if (roll > 0.92 && plat.width >= 48) {
    const spacing = 14;
    const cx = plat.x + plat.width / 2;
    for (let ci = -1; ci <= 1; ci++) {
      _spawn(cx + ci * spacing - COIN_SZ / 2, onY, "coin");
    }
  } else if (roll > 0.78 && plat.width >= 32) {
    const gap = plat.width * 0.3;
    const cx  = plat.x + plat.width / 2;
    _spawn(cx - gap / 2 - COIN_SZ / 2, onY, "coin");
    _spawn(cx + gap / 2 - COIN_SZ / 2, onY, "coin");
  } else {
    _spawn(plat.x + plat.width / 2 - COIN_SZ / 2, onY, "coin");
  }
});

function _spawnForNewPlatform(idx) {
  const plat = platformGroups[idx];

  if (idx > 0) {
    const A = platformGroups[idx - 1];
    const B = plat;
    const ax = A.x + A.width / 2;
    const ay = A.y;
    const bx = B.x + B.width / 2;
    const by = B.y;
    const dx = bx - ax;
    const vertGap = Math.abs(by - ay);

    if (Math.abs(dx) <= 220 && vertGap >= 16) {
      const roll = _crng();
      if (roll >= 0.05) {
        const isHeartArc = roll > 0.92;
        const higherY  = Math.min(ay, by);
        const peakLift = 36;
        const arcPeak  = (ay + by) / 2 - (higherY - peakLift);

        if (isHeartArc) {
          const hx = ax + 0.5 * dx - COIN_SZ / 2;
          const hy = (ay + by) / 2 - arcPeak - COIN_SZ / 2;
          if (hx >= 0 && hx + COIN_SZ <= WORLD_WIDTH) {
            _spawn(hx, hy, "heart");
          }
        } else {
          for (let ci = 0; ci < ARC_COINS; ci++) {
            const t  = (ci + 1) / (ARC_COINS + 1);
            const cx = ax + t * dx - COIN_SZ / 2;
            const cy = ay + t * (by - ay) - arcPeak * Math.sin(Math.PI * t) - COIN_SZ / 2;
            if (cx < 0 || cx + COIN_SZ > WORLD_WIDTH) continue;
            _spawn(cx, cy, "coin");
          }
        }
      }
    }
  }

  const roll2 = _crng();
  if (roll2 >= 0.55) {
    const onY = plat.y - COIN_SZ - 2;
    if (roll2 > 0.92 && plat.width >= 48) {
      const spacing = 14;
      const cx = plat.x + plat.width / 2;
      for (let ci = -1; ci <= 1; ci++) {
        _spawn(cx + ci * spacing - COIN_SZ / 2, onY, "coin");
      }
    } else if (roll2 > 0.78 && plat.width >= 32) {
      const gap = plat.width * 0.3;
      const cx  = plat.x + plat.width / 2;
      _spawn(cx - gap / 2 - COIN_SZ / 2, onY, "coin");
      _spawn(cx + gap / 2 - COIN_SZ / 2, onY, "coin");
    } else {
      _spawn(plat.x + plat.width / 2 - COIN_SZ / 2, onY, "coin");
    }
  }
}

function updateCollectibles() {
  collectibles.forEach((item) => {
    if (item.collected && !item._popping) return;
    item.update();
  });
}

function checkCollectibleCollisions() {
  const ph = player.hitbox;
  const pLeft   = ph.position.x;
  const pRight  = ph.position.x + ph.width;
  const pTop    = ph.position.y;
  const pBottom = ph.position.y + ph.height;

  collectibles.forEach((item) => {
    if (item.collected) return;
    if (!item.loaded)   return;
    const pad = 3;
    const iLeft   = item.position.x - pad;
    const iRight  = item.position.x + item._displaySize + pad;
    const iTop    = item.position.y - pad;
    const iBottom = item.position.y + item._displaySize + pad;
    if (pRight > iLeft && pLeft < iRight && pBottom > iTop && pTop < iBottom) {
      item.collect();
      if (item.type === "coin")  coinScore++;
      if (item.type === "heart") {
        if (heroHP < HERO_MAX_HP) {
          heroHP++;
        } else {
          HERO_MAX_HP = Math.min(6, HERO_MAX_HP + 1);
          heroHP = HERO_MAX_HP;
        }
      }
    }
  });
}

const _hudCoin  = document.createElement("canvas");
const _hudHeart = document.createElement("canvas");
_hudCoin.width  = _hudCoin.height  = 12;
_hudHeart.width = _hudHeart.height = 12;

(function _paintHudIcons() {
  const cc = _hudCoin.getContext("2d");
  const cg = cc.createRadialGradient(4, 4, 1, 6, 6, 6);
  cg.addColorStop(0, "#FFE57F");
  cg.addColorStop(0.5, "#FFB800");
  cg.addColorStop(1, "#8B6914");
  cc.fillStyle = cg;
  cc.beginPath();
  cc.arc(6, 6, 5.5, 0, Math.PI * 2);
  cc.fill();
  cc.strokeStyle = "#7A5200";
  cc.lineWidth = 1;
  cc.stroke();
  cc.fillStyle = "rgba(255,255,220,0.7)";
  cc.beginPath();
  cc.ellipse(4, 3.5, 2, 1.2, -0.5, 0, Math.PI * 2);
  cc.fill();

  const hc = _hudHeart.getContext("2d");
  const hg = hc.createRadialGradient(4, 5, 1, 6, 6, 6);
  hg.addColorStop(0, "#FF8888");
  hg.addColorStop(0.5, "#EE1111");
  hg.addColorStop(1, "#660000");
  hc.fillStyle = hg;
  hc.beginPath();
  hc.moveTo(6, 10.5);
  hc.bezierCurveTo(1, 7, 0, 4, 2, 2.5);
  hc.bezierCurveTo(3.5, 1, 5.5, 1.5, 6, 3);
  hc.bezierCurveTo(6.5, 1.5, 8.5, 1, 10, 2.5);
  hc.bezierCurveTo(12, 4, 11, 7, 6, 10.5);
  hc.fill();
  hc.strokeStyle = "#440000";
  hc.lineWidth = 0.8;
  hc.stroke();
})();

function drawHUD() {
  const panelW = 90;
  const panelH = 26;
  const px = canvas.width - panelW - 10;
  const py = 10;
  c.save();

  c.fillStyle = "rgba(0,0,0,0.5)";
  _roundRect(c, px, py, panelW, panelH, 6);
  c.fill();
  c.strokeStyle = "rgba(255,255,255,0.12)";
  c.lineWidth = 1;
  _roundRect(c, px, py, panelW, panelH, 6);
  c.stroke();

  c.drawImage(_hudCoin, px + 8, py + 7, 12, 12);
  c.fillStyle   = "#FFD700";
  c.font        = "bold 13px monospace";
  c.textBaseline = "middle";
  c.fillText(`× ${coinScore}`, px + 24, py + 13);

  c.restore();
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function animate() {
  window.requestAnimationFrame(animate);

  c.fillStyle = "white";
  c.fillRect(0, 0, canvas.width, canvas.height);

  drawBackground();

  c.save();
  c.scale(GAME_SCALE, GAME_SCALE);
  c.translate(camera.position.x, camera.position.y);

  drawSteppingStones();

  collisionBlocks.forEach((block) => {
    c.fillStyle = "#5D4037";
    c.fillRect(block.position.x, block.position.y, block.width, block.height);
    c.fillStyle = "#4CAF50";
    c.fillRect(block.position.x, block.position.y, block.width, 4);
  });

  if (!gameOver) {
    checkWorldExtension();
    checkCollectibleCollisions();
    updateCollectibles();
    updateBats();
    drawHeroHitEffect();
    updateHero();
    updateFlyPower();         // override velocity after hero physics
    drawFlyPowerEffects();    // world-space aura & sprite (inside camera)
    clampCamera();
  } else {
    updateCollectibles();
    bats.forEach((bat) => bat.draw());
    player.draw();
  }

  c.restore();

  drawHUD();
  drawHPHearts();
  drawFlyPowerHUD();          // fly bar top-left
  drawFlyButton();            // test button bottom-right
  drawGameOverScreen();

  if (!gameOver) checkRespawn();
}

window.addEventListener("keydown", (event) => {
  if (gameOver && deathTimer > DEATH_DELAY) {
    location.reload();
  }
});

animate();