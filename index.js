// ============================================================
//  Master Jumper – Vertical Climbing Platformer
// ============================================================

const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();

let scaledCanvas = {
  width: canvas.width / 4,
  height: canvas.height / 4,
};

// ---- Parse collision data (uses WORLD_COLS from collisions.js) ----

const floorCollisions2D = [];
for (let i = 0; i < floorCollisions.length; i += WORLD_COLS) {
  floorCollisions2D.push(floorCollisions.slice(i, i + WORLD_COLS));
}

const collisionBlocks = [];
floorCollisions2D.forEach((row, y) => {
  row.forEach((symbol, x) => {
    if (symbol === 202) {
      collisionBlocks.push(
        new CollisionBlock({
          position: { x: x * 16, y: y * 16 },
        }),
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
        new CollisionBlock({
          position: { x: x * 16, y: y * 16 },
          height: 4,
        }),
      );
    }
  });
});

// ---- Physics ----
const gravity = 0.2;

// ---- Player (starts on the ground at the bottom) ----
const player = new Player({
  position: {
    x: 100,
    y: WORLD_HEIGHT - 80,
  },
  collisionBlocks,
  platformCollisionBlocks,
  imageSrc: "./img/warrior/Idle.png",
  frameRate: 8,
  animations: {
    Idle: { imageSrc: "./img/warrior/Idle.png", frameRate: 8, frameBuffer: 3 },
    Run: { imageSrc: "./img/warrior/Run.png", frameRate: 8, frameBuffer: 5 },
    Jump: { imageSrc: "./img/warrior/Jump.png", frameRate: 2, frameBuffer: 3 },
    Fall: { imageSrc: "./img/warrior/Fall.png", frameRate: 2, frameBuffer: 3 },
    FallLeft: {
      imageSrc: "./img/warrior/FallLeft.png",
      frameRate: 2,
      frameBuffer: 3,
    },
    RunLeft: {
      imageSrc: "./img/warrior/RunLeft.png",
      frameRate: 8,
      frameBuffer: 5,
    },
    IdleLeft: {
      imageSrc: "./img/warrior/IdleLeft.png",
      frameRate: 8,
      frameBuffer: 3,
    },
    JumpLeft: {
      imageSrc: "./img/warrior/JumpLeft.png",
      frameRate: 2,
      frameBuffer: 3,
    },
  },
});

// ---- Input ----
const keys = {
  d: { pressed: false },
  a: { pressed: false },
};

// ---- Background ----
const background = new Sprite({
  position: { x: 0, y: 0 },
  imageSrc: "./img/background.png",
});

// ---- Camera (start showing the bottom of the world) ----
const camera = {
  position: {
    x: 0,
    y: -(WORLD_HEIGHT - scaledCanvas.height),
  },
};

// ---- Score tracking ----
let maxHeight = 0;
const groundY = (WORLD_ROWS - 1) * 16;

// ---- Resize handler ----
window.addEventListener("resize", () => {
  resizeCanvas();
  scaledCanvas = {
    width: canvas.width / 4,
    height: canvas.height / 4,
  };
});

// ============================================================
//  Game Loop
// ============================================================
function animate() {
  window.requestAnimationFrame(animate);

  c.fillStyle = "white";
  c.fillRect(0, 0, canvas.width, canvas.height);

  c.save();
  c.scale(4, 4);
  c.translate(camera.position.x, camera.position.y);

  // ---- Sky ----
  c.fillStyle = "#4A90D9";
  c.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // ---- Background image at the ground level ----
  if (background.loaded) {
    c.drawImage(background.image, 0, WORLD_HEIGHT - 432, WORLD_WIDTH, 432);
  }

  // ---- Draw platforms (brown blocks with green tops) ----
  platformCollisionBlocks.forEach((block) => {
    c.fillStyle = "#6D4C41";
    c.fillRect(block.position.x, block.position.y, 16, 16);
    c.fillStyle = "#66BB6A";
    c.fillRect(block.position.x, block.position.y, 16, 4);
  });

  // ---- Draw ground ----
  collisionBlocks.forEach((block) => {
    c.fillStyle = "#5D4037";
    c.fillRect(block.position.x, block.position.y, block.width, block.height);
    c.fillStyle = "#4CAF50";
    c.fillRect(block.position.x, block.position.y, block.width, 4);
  });

  // ---- Player ----
  player.checkForHorizontalCanvasCollision();
  player.update();

  player.velocity.x = 0;
  if (keys.d.pressed) {
    player.switchSprite("Run");
    player.velocity.x = 3;
    player.lastDirection = "right";
    player.shouldPanCameraToTheLeft({ canvas, camera });
  } else if (keys.a.pressed) {
    player.switchSprite("RunLeft");
    player.velocity.x = -3;
    player.lastDirection = "left";
    player.shouldPanCameraToTheRight({ canvas, camera });
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

  // ---- Clamp camera to world bounds ----
  if (camera.position.y > 0) camera.position.y = 0;
  const minCamY = -(WORLD_HEIGHT - scaledCanvas.height);
  if (camera.position.y < minCamY) camera.position.y = minCamY;
  if (camera.position.x > 0) camera.position.x = 0;
  if (camera.position.x < -(WORLD_WIDTH - scaledCanvas.width))
    camera.position.x = -(WORLD_WIDTH - scaledCanvas.width);

  c.restore();

  // ---- HUD (screen space) ----
  const currentHeight = Math.max(
    0,
    Math.floor((groundY - player.hitbox.position.y) / 16),
  );
  maxHeight = Math.max(maxHeight, currentHeight);

  // Score panel background
  c.fillStyle = "rgba(0, 0, 0, 0.5)";
  c.fillRect(10, 10, 200, 70);

  c.font = "bold 26px Arial";
  c.fillStyle = "#FFD700";
  c.fillText("⬆ Best: " + maxHeight + " m", 20, 40);

  c.font = "20px Arial";
  c.fillStyle = "white";
  c.fillText("Height: " + currentHeight + " m", 20, 68);

  // Controls hint (bottom of screen)
  c.font = "16px Arial";
  c.fillStyle = "rgba(255,255,255,0.6)";
  const hint = "W / ↑ / Space: Jump  |  A / ←: Left  |  D / →: Right";
  c.fillText(hint, 20, canvas.height - 20);

  // ---- Respawn if somehow fallen out of world ----
  if (player.position.y > WORLD_HEIGHT + 100) {
    player.position.x = 100;
    player.position.y = WORLD_HEIGHT - 80;
    player.velocity.y = 0;
    camera.position.y = -(WORLD_HEIGHT - scaledCanvas.height);
  }
}

animate();

// ============================================================
//  Input handling
// ============================================================
window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  switch (event.key) {
    case "d":
    case "ArrowRight":
      keys.d.pressed = true;
      break;
    case "a":
    case "ArrowLeft":
      keys.a.pressed = true;
      break;
    case "w":
    case "ArrowUp":
    case " ":
      if (player.isOnGround) {
        player.velocity.y = -5.5;
        player.isOnGround = false;
      }
      break;
  }
});

window.addEventListener("keyup", (event) => {
  switch (event.key) {
    case "d":
    case "ArrowRight":
      keys.d.pressed = false;
      break;
    case "a":
    case "ArrowLeft":
      keys.a.pressed = false;
      break;
  }
});
