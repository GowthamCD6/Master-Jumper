// ============================================================
// World configuration
// ============================================================
const WORLD_COLS = 36;
const WORLD_ROWS = 200;
const WORLD_WIDTH = WORLD_COLS * 16;   // 576
const WORLD_HEIGHT = WORLD_ROWS * 16;  // 3200

// ============================================================
// Floor collisions – solid ground at the very bottom row
// ============================================================
const floorCollisions = new Array(WORLD_COLS * WORLD_ROWS).fill(0);

for (let col = 0; col < WORLD_COLS; col++) {
  floorCollisions[(WORLD_ROWS - 1) * WORLD_COLS + col] = 202;
}

// ============================================================
// Platform collisions – one-way platforms ascending upward
// Zigzag pattern:  Left → Center → Right → Center → repeat
// ============================================================
const platformCollisions = new Array(WORLD_COLS * WORLD_ROWS).fill(0);

const _platformDefs = [
  { startCol: 4,  width: 5 },   // left
  { startCol: 15, width: 5 },   // center
  { startCol: 26, width: 5 },   // right
  { startCol: 15, width: 5 },   // center
];

let _pIdx = 0;
for (let row = WORLD_ROWS - 4; row >= 3; row -= 3) {
  const def = _platformDefs[_pIdx % _platformDefs.length];
  for (let col = def.startCol; col < def.startCol + def.width; col++) {
    platformCollisions[row * WORLD_COLS + col] = 202;
  }
  _pIdx++;
}
