// ============================================================
// World configuration
// ============================================================
const WORLD_COLS = 15;                    // fits 480px canvas: 480/GAME_SCALE=240, 15*16=240
const WORLD_ROWS = 200;
const GAME_SCALE = 2;                     // canvas scale factor
const WORLD_WIDTH = WORLD_COLS * 16;      // 240px – exactly matches scaled canvas width
const WORLD_HEIGHT = WORLD_ROWS * 16;     // 3200

// ============================================================
// Floor collisions – solid ground at the very bottom row
// ============================================================
const floorCollisions = new Array(WORLD_COLS * WORLD_ROWS).fill(0);

for (let col = 0; col < WORLD_COLS; col++) {
  floorCollisions[(WORLD_ROWS - 1) * WORLD_COLS + col] = 202;
}

// ============================================================
// Platform collisions – dynamic difficulty with easy/hard zones
// Uses a seeded RNG for consistent layout across reloads
// ============================================================
const platformCollisions = new Array(WORLD_COLS * WORLD_ROWS).fill(0);

// Simple seeded pseudo-random (mulberry32)
function _seededRng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const _rng = _seededRng(42);

// Helper: random int in [min, max]
function _randInt(min, max) {
  return Math.floor(_rng() * (max - min + 1)) + min;
}

// platformGroups – one object per stone (for sprite drawing)
const platformGroups = [];

// ── Generate platforms with EASY / HARD zones ───────────────
// Player physics: jump vel = -6, gravity = 0.2
// Max jump height ≈ 90px (~5.6 tiles), horizontal speed = 3px/frame
// Jump arc ≈ 60 frames → max horizontal travel ≈ 180px
// Minimum gap = 5 rows (80px) to prevent stone sprite overlap

let _prevCol = 0;
let _prevWidth = 5;
let _pIdx = 0;
let _row = WORLD_ROWS - 4;

// Difficulty zones: alternate between easy and hard
let _zoneLength = 0;      // platforms remaining in current zone
let _isHardZone = false;  // current zone difficulty

function _startNewZone() {
  _zoneLength = _randInt(4, 8);  // 4-8 platforms per zone
  _isHardZone = _rng() < 0.4;    // 40% chance of hard zone
}
_startNewZone();

// First platform: wide, centered (safe starting area)
{
  const startDef = { startCol: Math.floor((WORLD_COLS - 6) / 2), width: 6 };
  for (let col = startDef.startCol; col < startDef.startCol + startDef.width; col++) {
    platformCollisions[_row * WORLD_COLS + col] = 202;
  }
  platformGroups.push({
    x: startDef.startCol * 16,
    y: _row * 16,
    width: startDef.width * 16,
    stoneType: 4,
  });
  _prevCol = startDef.startCol;
  _prevWidth = startDef.width;
  _pIdx++;
  _row -= _randInt(5, 6);  // larger initial gap
}

// Continue generating until we reach the very top
while (_row >= 0) {
  // Check if we need a new zone
  if (_zoneLength <= 0) _startNewZone();
  _zoneLength--;

  // ── Platform width based on difficulty ──────────────────
  let platWidth;
  if (_isHardZone) {
    // HARD: smaller platforms (2-3 tiles), occasional 4
    const roll = _rng();
    if (roll < 0.35)      platWidth = 2;
    else if (roll < 0.75) platWidth = 3;
    else                  platWidth = 4;
  } else {
    // EASY: larger platforms (3-5 tiles), occasional 2
    const roll = _rng();
    if (roll < 0.10)      platWidth = 2;
    else if (roll < 0.35) platWidth = 3;
    else if (roll < 0.70) platWidth = 4;
    else                  platWidth = 5;
  }

  // ── Horizontal position with proper reach calculation ───
  const prevCenter = _prevCol + _prevWidth / 2;
  const maxJumpTiles = _isHardZone ? 6 : 8;  // tighter reach in hard zones

  let minCol = Math.max(0, Math.floor(prevCenter - maxJumpTiles - platWidth / 2));
  let maxCol = Math.min(WORLD_COLS - platWidth, Math.floor(prevCenter + maxJumpTiles - platWidth / 2));

  // Add variety: sometimes force big horizontal jumps in hard mode
  let startCol;
  if (_isHardZone && _rng() < 0.4) {
    // Force a far jump (left or right edge of reach)
    if (_rng() < 0.5) {
      startCol = _randInt(minCol, Math.min(minCol + 2, maxCol));
    } else {
      startCol = _randInt(Math.max(minCol, maxCol - 2), maxCol);
    }
  } else {
    // Normal placement with some bias
    const biasRoll = _rng();
    if (biasRoll < 0.30) {
      startCol = _randInt(minCol, Math.max(minCol, Math.floor((minCol + maxCol) / 2) - 1));
    } else if (biasRoll < 0.60) {
      startCol = _randInt(Math.min(maxCol, Math.ceil((minCol + maxCol) / 2) + 1), maxCol);
    } else {
      startCol = _randInt(minCol, maxCol);
    }
  }
  startCol = Math.max(0, Math.min(WORLD_COLS - platWidth, startCol));

  // ── Pick stone type based on size ───────────────────────
  let stoneType;
  if (platWidth <= 2)       stoneType = _randInt(3, 3);
  else if (platWidth === 3) stoneType = _randInt(0, 2);
  else if (platWidth === 4) stoneType = _randInt(1, 5);
  else                      stoneType = _randInt(4, 5);

  // ── Write collision tiles ───────────────────────────────
  for (let col = startCol; col < startCol + platWidth; col++) {
    platformCollisions[_row * WORLD_COLS + col] = 202;
  }

  platformGroups.push({
    x: startCol * 16,
    y: _row * 16,
    width: platWidth * 16,
    stoneType: stoneType,
  });

  _prevCol = startCol;
  _prevWidth = platWidth;
  _pIdx++;

  // ── Vertical gap based on difficulty ────────────────────
  // Minimum 5 rows (80px) to prevent stone sprite overlap
  let vertGap;
  if (_isHardZone) {
    // HARD: bigger gaps (5-6 rows), pushing jump limits
    vertGap = _randInt(5, 6);
  } else {
    // EASY: standard gaps (5 rows), comfortable jumps
    vertGap = _randInt(5, 5);
  }
  _row -= vertGap;

  // If this was the last platform and we skipped past the top, force a final platform at y=0
  if (_row < 0 && _row + vertGap > 0) {
    const topPlatWidth = 4;
    const topStartCol = Math.floor((WORLD_COLS - topPlatWidth) / 2);
    for (let col = topStartCol; col < topStartCol + topPlatWidth; col++) {
      platformCollisions[col] = 202; // y=0 row
    }
    platformGroups.push({
      x: topStartCol * 16,
      y: 0,
      width: topPlatWidth * 16,
      stoneType: 3,
    });
  }
}
