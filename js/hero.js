// ============================================================
//  Hero – Player instance & animation config
// ============================================================

const gravity = 0.2;

const player = new Player({
  position: {
    x: Math.floor((WORLD_WIDTH - 40) / 2),  // centered in wider world
    y: WORLD_HEIGHT - 80,
  },
  collisionBlocks,
  platformCollisionBlocks,
  imageSrc: "./img/warrior/Idle.png",
  frameRate: 8,
  animations: {
    Idle:     { imageSrc: "./img/warrior/Idle.png",     frameRate: 8, frameBuffer: 3 },
    Run:      { imageSrc: "./img/warrior/Run.png",      frameRate: 8, frameBuffer: 5 },
    Jump:     { imageSrc: "./img/warrior/Jump.png",     frameRate: 2, frameBuffer: 3 },
    Fall:     { imageSrc: "./img/warrior/Fall.png",     frameRate: 2, frameBuffer: 3 },
    FallLeft: { imageSrc: "./img/warrior/FallLeft.png", frameRate: 2, frameBuffer: 3 },
    RunLeft:  { imageSrc: "./img/warrior/RunLeft.png",  frameRate: 8, frameBuffer: 5 },
    IdleLeft: { imageSrc: "./img/warrior/IdleLeft.png", frameRate: 8, frameBuffer: 3 },
    JumpLeft: { imageSrc: "./img/warrior/JumpLeft.png", frameRate: 2, frameBuffer: 3 },
  },
});

/**
 * Handle player movement, sprite switching and camera panning.
 */
function updateHero() {
  player.checkForHorizontalCanvasCollision();
  player.update();

  player.velocity.x = 0;
  if (keys.d.pressed) {
    player.switchSprite("Run");
    player.velocity.x = 3;
    player.lastDirection = "right";
  } else if (keys.a.pressed) {
    player.switchSprite("RunLeft");
    player.velocity.x = -3;
    player.lastDirection = "left";
  } else if (player.velocity.y === 0) {
    if (player.lastDirection === "right") player.switchSprite("Idle");
    else player.switchSprite("IdleLeft");
  }

  if (player.velocity.y < 0) {
    player.shouldPanCameraDown({ camera, canvas });
    if (player.lastDirection === "right") player.switchSprite("Jump");
    else player.switchSprite("JumpLeft");
  } else if (player.velocity.y > 0) {
    player.shouldPanCameraUp({ camera, canvas });
    if (player.lastDirection === "right") player.switchSprite("Fall");
    else player.switchSprite("FallLeft");
  }
}

/**
 * Respawn player at bottom if they fall out of the world.
 */
function checkRespawn() {
  if (player.position.y > WORLD_HEIGHT + 100) {
    player.position.x = Math.floor((WORLD_WIDTH - 40) / 2);
    player.position.y = WORLD_HEIGHT - 80;
    player.velocity.y = 0;
    camera.position.y = -(WORLD_HEIGHT - scaledCanvas.height);
  }
}
