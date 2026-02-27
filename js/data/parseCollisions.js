// ============================================================
//  Parse raw collision arrays into CollisionBlock objects
// ============================================================

const floorCollisions2D = [];
for (let i = 0; i < floorCollisions.length; i += WORLD_COLS) {
  floorCollisions2D.push(floorCollisions.slice(i, i + WORLD_COLS));
}

const collisionBlocks = [];
floorCollisions2D.forEach((row, y) => {
  row.forEach((symbol, x) => {
    if (symbol === 202) {
      collisionBlocks.push(
        new CollisionBlock({ position: { x: x * 16, y: y * 16 } }),
      );
    }
  });
});

// ── Platform collision blocks ──────────────────────────────
// Instead of using individual 16px tiles, create ONE collision
// block per stepping stone that matches its full visual width
// (including overhang).  This ensures the landing area lines up
// exactly with what the player sees on screen.
const platformCollisionBlocks = [];

platformGroups.forEach((group) => {
  // Match the overhang calculation in SteppingStone.js
  const overhang = Math.min(16, group.width * 0.2);
  const fullWidth = group.width + overhang;
  const startX = group.x - overhang / 2;

  platformCollisionBlocks.push(
    new CollisionBlock({
      position: { x: startX, y: group.y },
      height: 14,    // slightly thicker landing zone for reliable detection
      width: fullWidth,
    }),
  );
});
