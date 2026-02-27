// ============================================================
//  HUD – Coins & Hearts display
// ============================================================

// Preload HUD icons (small canvas-drawn copies so no extra files needed)
const _hudCoin  = document.createElement('canvas');
const _hudHeart = document.createElement('canvas');
_hudCoin.width  = _hudCoin.height  = 12;
_hudHeart.width = _hudHeart.height = 12;

(function _paintHudIcons() {
  // Coin icon – golden circle
  const cc = _hudCoin.getContext('2d');
  const cg = cc.createRadialGradient(4, 4, 1, 6, 6, 6);
  cg.addColorStop(0, '#FFE57F');
  cg.addColorStop(0.5, '#FFB800');
  cg.addColorStop(1, '#8B6914');
  cc.fillStyle = cg;
  cc.beginPath();
  cc.arc(6, 6, 5.5, 0, Math.PI * 2);
  cc.fill();
  cc.strokeStyle = '#7A5200';
  cc.lineWidth = 1;
  cc.stroke();
  // shine
  cc.fillStyle = 'rgba(255,255,220,0.7)';
  cc.beginPath();
  cc.ellipse(4, 3.5, 2, 1.2, -0.5, 0, Math.PI * 2);
  cc.fill();

  // Heart icon
  const hc = _hudHeart.getContext('2d');
  const hg = hc.createRadialGradient(4, 5, 1, 6, 6, 6);
  hg.addColorStop(0, '#FF8888');
  hg.addColorStop(0.5, '#EE1111');
  hg.addColorStop(1, '#660000');
  hc.fillStyle = hg;
  hc.beginPath();
  hc.moveTo(6, 10.5);
  hc.bezierCurveTo(1, 7, 0, 4, 2, 2.5);
  hc.bezierCurveTo(3.5, 1, 5.5, 1.5, 6, 3);
  hc.bezierCurveTo(6.5, 1.5, 8.5, 1, 10, 2.5);
  hc.bezierCurveTo(12, 4, 11, 7, 6, 10.5);
  hc.fill();
  hc.strokeStyle = '#440000';
  hc.lineWidth = 0.8;
  hc.stroke();
})();

function drawHUD() {
  const pad  = 10;
  const iconW = 16;

  c.save();

  // ── Background pill ────────────────────────────────────────
  c.fillStyle = 'rgba(0,0,0,0.45)';
  _roundRect(c, pad, pad, 140, 30, 8);
  c.fill();

  // ── Coin icon + count ──────────────────────────────────────
  c.drawImage(_hudCoin, pad + 8, pad + 9, 12, 12);
  c.fillStyle   = '#FFD700';
  c.font        = 'bold 14px monospace';
  c.textBaseline = 'middle';
  c.fillText(`× ${coinScore}`, pad + 25, pad + 15);

  // ── Separator ──────────────────────────────────────────────
  c.fillStyle = 'rgba(255,255,255,0.2)';
  c.fillRect(pad + 70, pad + 6, 1, 18);

  // ── Heart icon + count ─────────────────────────────────────
  c.drawImage(_hudHeart, pad + 78, pad + 9, 12, 12);
  c.fillStyle = '#FF6666';
  c.fillText(`× ${heartCount}`, pad + 95, pad + 15);

  c.restore();
}

// Helper – rounded rectangle path (no native roundRect in all browsers)
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
