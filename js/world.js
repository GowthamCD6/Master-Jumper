const WORLD_COLS  = 15;
const WORLD_ROWS  = 200;
const GAME_SCALE  = 2;
const WORLD_WIDTH  = WORLD_COLS * 16;
const WORLD_HEIGHT = WORLD_ROWS * 16;

function _seededRng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const _rng = _seededRng(42);
function _randInt(min, max) {
  return Math.floor(_rng() * (max - min + 1)) + min;
}

const floorCollisions = new Array(WORLD_COLS * WORLD_ROWS).fill(0);
for (let col = 0; col < WORLD_COLS; col++) {
  floorCollisions[(WORLD_ROWS - 1) * WORLD_COLS + col] = 202;
}

const platformCollisions = new Array(WORLD_COLS * WORLD_ROWS).fill(0);
const platformGroups = [];

let _prevCol   = 0;
let _prevWidth = 5;
let _pIdx      = 0;
let _row       = WORLD_ROWS - 4;

let _zoneLength = 0;
let _isHardZone = false;
function _startNewZone() {
  _zoneLength = _randInt(4, 8);
  _isHardZone = _rng() < 0.4;
}
_startNewZone();

{
  const startDef = { startCol: Math.floor((WORLD_COLS - 6) / 2), width: 6 };
  for (let col = startDef.startCol; col < startDef.startCol + startDef.width; col++) {
    platformCollisions[_row * WORLD_COLS + col] = 202;
  }
  platformGroups.push({ x: startDef.startCol * 16, y: _row * 16, width: startDef.width * 16, stoneType: 4 });
  _prevCol = startDef.startCol;
  _prevWidth = startDef.width;
  _pIdx++;
  _row -= _randInt(5, 6);
}

let _lastSide = 0;

while (_row >= 0) {
  if (_zoneLength <= 0) _startNewZone();
  _zoneLength--;

  let platWidth;
  if (_isHardZone) {
    const roll = _rng();
    if (roll < 0.35)      platWidth = 2;
    else if (roll < 0.75) platWidth = 3;
    else                  platWidth = 4;
  } else {
    const roll = _rng();
    if (roll < 0.10)      platWidth = 2;
    else if (roll < 0.35) platWidth = 3;
    else if (roll < 0.70) platWidth = 4;
    else                  platWidth = 5;
  }

  const prevCenter = _prevCol + _prevWidth / 2;
  const maxJumpTiles = _isHardZone ? 5 : 6;

  let minCol = Math.max(0, Math.floor(prevCenter - maxJumpTiles - platWidth / 2));
  let maxCol = Math.min(WORLD_COLS - platWidth, Math.floor(prevCenter + maxJumpTiles - platWidth / 2));

  let startCol;
  const halfCols = Math.floor(WORLD_COLS / 2);

  if (_lastSide >= 0 && minCol < halfCols - 1) {
    startCol = _randInt(minCol, Math.min(Math.max(minCol, halfCols - 2), maxCol));
    _lastSide = -1;
  } else if (_lastSide < 0 && maxCol > halfCols) {
    startCol = _randInt(Math.max(minCol, halfCols), maxCol);
    _lastSide = 1;
  } else {
    startCol = _randInt(minCol, maxCol);
    _lastSide = (startCol + platWidth / 2 < halfCols) ? -1 : 1;
  }

  startCol = Math.max(0, Math.min(WORLD_COLS - platWidth, startCol));

  let stoneType;
  if (platWidth <= 2)       stoneType = _randInt(3, 3);
  else if (platWidth === 3) stoneType = _randInt(0, 2);
  else if (platWidth === 4) stoneType = _randInt(1, 5);
  else                      stoneType = _randInt(4, 5);

  for (let col = startCol; col < startCol + platWidth; col++) {
    platformCollisions[_row * WORLD_COLS + col] = 202;
  }
  platformGroups.push({ x: startCol * 16, y: _row * 16, width: platWidth * 16, stoneType });

  _prevCol = startCol;
  _prevWidth = platWidth;
  _pIdx++;

  _row -= 5;

  if (_row < 0 && _row + 5 > 0) {
    const topW = 4;
    const topCol = Math.floor((WORLD_COLS - topW) / 2);
    for (let col = topCol; col < topCol + topW; col++) {
      platformCollisions[col] = 202;
    }
    platformGroups.push({ x: topCol * 16, y: 0, width: topW * 16, stoneType: 3 });
  }
}

const floorCollisions2D = [];
for (let i = 0; i < floorCollisions.length; i += WORLD_COLS) {
  floorCollisions2D.push(floorCollisions.slice(i, i + WORLD_COLS));
}
const collisionBlocks = [];
floorCollisions2D.forEach((row, y) => {
  row.forEach((symbol, x) => {
    if (symbol === 202) {
      collisionBlocks.push(new CollisionBlock({ position: { x: x * 16, y: y * 16 } }));
    }
  });
});

const platformCollisionBlocks = [];
platformGroups.forEach((group) => {
  const overhang = Math.min(16, group.width * 0.2);
  const fullWidth = group.width + overhang;
  const startX = group.x - overhang / 2;
  platformCollisionBlocks.push(
    new CollisionBlock({ position: { x: startX, y: group.y }, height: 14, width: fullWidth }),
  );
});

const stoneImg = new Image();
stoneImg.src = "./img/warrior/stepstone.png";
let stoneLoaded = false;

const stoneSprites = [
  { sx: 20,  sy: 9,   sw: 128, sh: 156 },
  { sx: 218, sy: 17,  sw: 126, sh: 122 },
  { sx: 172, sy: 144, sw: 125, sh: 128 },
  { sx: 41,  sy: 219, sw: 85,  sh: 103 },
  { sx: 4,   sy: 357, sw: 182, sh: 173 },
  { sx: 93,  sy: 544, sw: 146, sh: 141 },
];
const MAX_STONE_HEIGHT = 60;

const _stoneCaches = [];

stoneImg.onload = () => {
  stoneLoaded = true;

  platformGroups.forEach((group) => {
    const stone = stoneSprites[group.stoneType];
    const overhang = Math.min(16, group.width * 0.2);
    const drawW = Math.round(group.width + overhang);
    let drawH = Math.round(drawW * (stone.sh / stone.sw));
    drawH = Math.min(drawH, MAX_STONE_HEIGHT);

    const off = document.createElement("canvas");
    off.width  = drawW;
    off.height = drawH;
    const oc = off.getContext("2d");
    oc.imageSmoothingEnabled = false;
    oc.drawImage(stoneImg, stone.sx, stone.sy, stone.sw, stone.sh, 0, 0, drawW, drawH);

    _stoneCaches.push({ canvas: off, drawW, drawH, overhang });
  });
};

function drawSteppingStones() {
  if (!stoneLoaded) return;
  platformGroups.forEach((group, i) => {
    const cache = _stoneCaches[i];
    if (!cache) return;
    const drawX = group.x - cache.overhang / 2;
    const drawY = group.y;
    c.drawImage(cache.canvas, drawX, drawY);
  });
}

const bgImage = new Image();
bgImage.src = "./img/background2.jpg";
let bgLoaded = false;
bgImage.onload = () => { bgLoaded = true; };

function drawBackground() {
  if (bgLoaded) c.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
}

const camera = {
  position: { x: 0, y: 0 },
};

function clampCamera() {
  if (camera.position.y > 0) camera.position.y = 0;
  const minCamY = -(WORLD_HEIGHT - scaledCanvas.height);
  if (camera.position.y < minCamY) camera.position.y = minCamY;
  camera.position.x = 0;
}