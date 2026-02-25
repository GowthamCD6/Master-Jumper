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

const platformCollisions2D = [];
for (let i = 0; i < platformCollisions.length; i += WORLD_COLS) {
  platformCollisions2D.push(platformCollisions.slice(i, i + WORLD_COLS));
}

const platformCollisionBlocks = [];
platformCollisions2D.forEach((row, y) => {
  row.forEach((symbol, x) => {
    if (symbol === 202) {
      platformCollisionBlocks.push(
        new CollisionBlock({ position: { x: x * 16, y: y * 16 }, height: 10 }),
      );
    }
  });
});
