// ============================================================
//  Master Jumper – Game Loop (entry point, loaded last)
//
//  File structure:
//    js/utils.js                – Collision helpers
//    js/classes/CollisionBlock.js – Collision block class
//    js/classes/Sprite.js       – Base sprite class
//    js/classes/Player.js       – Hero class (physics, collisions)
//    js/classes/SteppingStone.js – Stone spritesheet & renderer
//    js/data/collisions.js      – World config & platform data
//    js/data/parseCollisions.js – Parse raw arrays → block objects
//    js/canvas.js               – Canvas setup & scaling
//    js/background.js           – Background image
//    js/hero.js                 – Hero instance & movement
//    js/camera.js               – Camera position & clamping
//    js/hud.js                  – Score / height display
//    js/input.js                – Keyboard input
// ============================================================

function animate() {
  window.requestAnimationFrame(animate);

  // Clear
  c.fillStyle = "white";
  c.fillRect(0, 0, canvas.width, canvas.height);

  // Background (screen space)
  drawBackground();

  // World space
  c.save();
  c.scale(GAME_SCALE, GAME_SCALE);
  // No horizontal offset needed – WORLD_WIDTH exactly matches scaledCanvas.width
  c.translate(camera.position.x, camera.position.y);

  // Stepping stones
  drawSteppingStones();

  // Ground
  collisionBlocks.forEach((block) => {
    c.fillStyle = "#5D4037";
    c.fillRect(block.position.x, block.position.y, block.width, block.height);
    c.fillStyle = "#4CAF50";
    c.fillRect(block.position.x, block.position.y, block.width, 4);
  });

  // Hero
  updateHero();

  // Camera
  clampCamera();

  c.restore();

  // HUD (screen space)
  drawHUD();

  // Respawn check
  checkRespawn();
}

animate();
