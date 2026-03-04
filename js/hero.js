const gravity = 0.07;

const player = new Player({
  position: {
    x: Math.floor((WORLD_WIDTH - 40) / 2),
    y: WORLD_HEIGHT - 80,
  },
  collisionBlocks,
  platformCollisionBlocks,
  imageSrc: "./assets/img/warrior/Idle.png",
  frameRate: 8,
  animations: {
    Idle:     { imageSrc: "./assets/img/warrior/Idle.png",     frameRate: 8, frameBuffer: 3 },
    Run:      { imageSrc: "./assets/img/warrior/Run.png",      frameRate: 8, frameBuffer: 5 },
    Jump:     { imageSrc: "./assets/img/warrior/Jump.png",     frameRate: 2, frameBuffer: 3 },
    Fall:     { imageSrc: "./assets/img/warrior/Fall.png",     frameRate: 2, frameBuffer: 3 },
    FallLeft: { imageSrc: "./assets/img/warrior/FallLeft.png", frameRate: 2, frameBuffer: 3 },
    RunLeft:  { imageSrc: "./assets/img/warrior/RunLeft.png",  frameRate: 8, frameBuffer: 5 },
    IdleLeft: { imageSrc: "./assets/img/warrior/IdleLeft.png", frameRate: 8, frameBuffer: 3 },
    JumpLeft: { imageSrc: "./assets/img/warrior/JumpLeft.png", frameRate: 2, frameBuffer: 3 },
  },
});

function updateHero() {
  player.checkForHorizontalCanvasCollision();
  player.update();

  player.velocity.x = 0;
  if (keys.d.pressed) {
    player.switchSprite("Run");
    player.velocity.x = 2.5;
    player.lastDirection = "right";
  } else if (keys.a.pressed) {
    player.switchSprite("RunLeft");
    player.velocity.x = -2.5;
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

function checkRespawn() {
  if (player.position.y > WORLD_HEIGHT + 100) {
    player.position.x = Math.floor((WORLD_WIDTH - 40) / 2);
    player.position.y = WORLD_HEIGHT - 80;
    player.velocity.y = 0;
    camera.position.y = -(WORLD_HEIGHT - scaledCanvas.height);
  }
}