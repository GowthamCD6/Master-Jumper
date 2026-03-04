const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");

const GAME_WIDTH  = 480;
const GAME_HEIGHT = 700;

function resizeCanvas() {
  const scaleX = window.innerWidth / GAME_WIDTH;
  const scaleY = window.innerHeight / GAME_HEIGHT;
  const fitScale = Math.min(scaleX, scaleY);
  canvas.width  = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  canvas.style.width  = Math.floor(GAME_WIDTH  * fitScale) + "px";
  canvas.style.height = Math.floor(GAME_HEIGHT * fitScale) + "px";
  c.imageSmoothingEnabled = false;
}
resizeCanvas();

let scaledCanvas = {
  width:  GAME_WIDTH  / GAME_SCALE,
  height: GAME_HEIGHT / GAME_SCALE,
};

window.addEventListener("resize", () => {
  resizeCanvas();
  scaledCanvas = {
    width:  GAME_WIDTH  / GAME_SCALE,
    height: GAME_HEIGHT / GAME_SCALE,
  };
});

camera.position.y = -(WORLD_HEIGHT - scaledCanvas.height);

const gravity = 0.07;

const player = new Player({
  position: {
    x: Math.floor(WORLD_WIDTH / 2 - 62),
    y: WORLD_HEIGHT - 80,
  },
  collisionBlocks,
  platformCollisionBlocks,
  imageSrc: "./assets/img/warrior/Idle.png",
  frameRate: 8,
  animations: {
    Idle:     { imageSrc: "./assets/img/warrior/Idle.png",     frameRate: 8, frameBuffer: 8 },
    Run:      { imageSrc: "./assets/img/warrior/Run.png",      frameRate: 8, frameBuffer: 5 },
    Jump:     { imageSrc: "./assets/img/warrior/Jump.png",     frameRate: 2, frameBuffer: 3 },
    Fall:     { imageSrc: "./assets/img/warrior/Fall.png",     frameRate: 2, frameBuffer: 3 },
    FallLeft: { imageSrc: "./assets/img/warrior/FallLeft.png", frameRate: 2, frameBuffer: 3 },
    RunLeft:  { imageSrc: "./assets/img/warrior/RunLeft.png",  frameRate: 8, frameBuffer: 5 },
    IdleLeft: { imageSrc: "./assets/img/warrior/IdleLeft.png", frameRate: 8, frameBuffer: 8 },
    JumpLeft: { imageSrc: "./assets/img/warrior/JumpLeft.png", frameRate: 2, frameBuffer: 3 },
    Attack1:     { imageSrc: "./assets/img/warrior/Attack1.png",  frameRate: 4, frameBuffer: 8 },
    Attack2:     { imageSrc: "./assets/img/warrior/Attack2.png",  frameRate: 4, frameBuffer: 8 },
    Attack3:     { imageSrc: "./assets/img/warrior/Attack3.png",  frameRate: 4, frameBuffer: 8 },
  },
});

let isAttacking     = false;
let attackTimer     = 0;
let attackCombo     = 0; 
let comboWindow     = 0;
const ATTACK_DURATION = 32;
const COMBO_WINDOW    = 30;
const ATTACK_NAMES    = ["Attack1", "Attack2", "Attack3"];

function _updateHeroInBattle() {
  const scaledW = canvas.width / GAME_SCALE;
  const scaledH = GAME_HEIGHT / GAME_SCALE; 

  const HERO_H = 62.4;
  const HERO_W = 45;
  const HERO_VISUAL_W = 90;

  const BATTLE_FLOOR_Y = Math.round(scaledH * 0.70) - HERO_H;
  const BATTLE_LEFT    = 0;
  const BATTLE_RIGHT   = scaledW - HERO_VISUAL_W - 90;

  if (isAttacking) {
    attackTimer--;
    if (attackTimer <= 0) {
      isAttacking = false;
      player.flipX = false;
      comboWindow = COMBO_WINDOW;
    }
  }
  if (!isAttacking && comboWindow > 0) {
    comboWindow--;
    if (comboWindow <= 0) attackCombo = 0;
  }

  player.velocity.x = 0;
  if (keys.d.pressed) {
    player.velocity.x = 2.5;
    player.lastDirection = "right";
    if (!isAttacking) player.switchSprite("Run");
  } else if (keys.a.pressed) {
    player.velocity.x = -2.5;
    player.lastDirection = "left";
    if (!isAttacking) player.switchSprite("RunLeft");
  } else if (!isAttacking) {
    if (player.lastDirection === "right") player.switchSprite("Idle");
    else player.switchSprite("IdleLeft");
  }

  
  player.velocity.y += gravity;

  player.position.x += player.velocity.x;
  player.position.y += player.velocity.y;
  
  if (player.position.x < BATTLE_LEFT) {
    player.position.x = BATTLE_LEFT;
    player.velocity.x = 0;
  }
  if (player.position.x > BATTLE_RIGHT) {
    player.position.x = BATTLE_RIGHT;
    player.velocity.x = 0;
  }

  if (player.position.y >= BATTLE_FLOOR_Y) {
    player.position.y = BATTLE_FLOOR_Y;
    player.velocity.y = 0;
    player.isOnGround = true;
  } else {
    player.isOnGround = false;
    if (!isAttacking) {
      if (player.velocity.y < 0) {
        if (player.lastDirection === "right") player.switchSprite("Jump");
        else player.switchSprite("JumpLeft");
      } else if (player.velocity.y > 0.5) {
        if (player.lastDirection === "right") player.switchSprite("Fall");
        else player.switchSprite("FallLeft");
      }
    }
  }

  if (player.position.y < 30) {
    player.position.y = 30;
    player.velocity.y = 0;
  }

  if (isAttacking) {
    const atkName = ATTACK_NAMES[attackCombo];
    player.switchSprite(atkName);
    player.flipX = (player.lastDirection === "left");
  }

  player.updateFrames();
  player.updateHitbox();
  player.draw();
}

function updateHero() {
  const inBattleWorld = typeof isInBattleWorld === 'function' && isInBattleWorld();

  if (inBattleWorld) {
    _updateHeroInBattle();
    return;
  }

  player.checkForHorizontalCanvasCollision();
  player.update();

  if (isAttacking) {
    attackTimer--;
    if (attackTimer <= 0) {
      isAttacking = false;
      player.flipX = false;
      comboWindow = COMBO_WINDOW;
    }
  }
  if (!isAttacking && comboWindow > 0) {
    comboWindow--;
    if (comboWindow <= 0) attackCombo = 0;
  }

  player.velocity.x = 0;
  if (keys.d.pressed) {
    if (!isAttacking && !flyPowerActive) player.switchSprite("Run");
    player.velocity.x = 2.5;
    player.lastDirection = "right";
  } else if (keys.a.pressed) {
    if (!isAttacking && !flyPowerActive) player.switchSprite("RunLeft");
    player.velocity.x = -2.5;
    player.lastDirection = "left";
  } else if (player.velocity.y === 0 && !isAttacking) {
    if (player.lastDirection === "right") player.switchSprite("Idle");
    else player.switchSprite("IdleLeft");
  }

  if (player.velocity.y < 0 && !isAttacking && !flyPowerActive) {
    player.shouldPanCameraDown({ camera, canvas });
    if (player.lastDirection === "right") player.switchSprite("Jump");
    else player.switchSprite("JumpLeft");
  } else if (player.velocity.y > 0 && !isAttacking && !flyPowerActive) {
    player.shouldPanCameraUp({ camera, canvas });
    if (player.lastDirection === "right") player.switchSprite("Fall");
    else player.switchSprite("FallLeft");
  } else if (player.velocity.y < 0) {
    player.shouldPanCameraDown({ camera, canvas });
  } else if (player.velocity.y > 0) {
    player.shouldPanCameraUp({ camera, canvas });
  }

  if (flyPowerActive && !isAttacking) {
    if (player.lastDirection === "right") player.switchSprite("Idle");
    else player.switchSprite("IdleLeft");
  }

  if (isAttacking) {
    const atkName = ATTACK_NAMES[attackCombo];
    player.switchSprite(atkName);
    player.flipX = (player.lastDirection === "left");
  }
}

function checkRespawn() {
  if (player.position.y > WORLD_HEIGHT + 100) {
    if (!gameOver) {
      heroHP = 0;
      gameOver = true;
      deathTimer = 0;
    }
  }
  const cameraBottomY = -camera.position.y + scaledCanvas.height;
  if (player.position.y > cameraBottomY + scaledCanvas.height * 1.5) {
    if (!gameOver) {
      heroHP = 0;
      gameOver = true;
      deathTimer = 0;
    }
  }
}

const keys = { d: { pressed: false }, a: { pressed: false } };

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (gameOver) return;
  switch (event.key) {
    case "d": case "ArrowRight": keys.d.pressed = true;  break;
    case "a": case "ArrowLeft":  keys.a.pressed = true;  break;
    case "w": case "ArrowUp": case " ":
      if (player.isOnGround) {
        player.velocity.y = -3.5;
        player.isOnGround = false;
      }
      break;
    case "j": case "x":
      if (!isAttacking) {
        if (comboWindow <= 0) attackCombo = 0;
        else attackCombo = (attackCombo + 1) % ATTACK_NAMES.length;
        isAttacking = true;
        attackTimer = ATTACK_DURATION;
        comboWindow = 0;
        player.currentFrame = 0;
        player.flipX = (player.lastDirection === "left");
        checkAttackHitBats();
      }
      break;
  }
});

window.addEventListener("keyup", (event) => {
  switch (event.key) {
    case "d": case "ArrowRight": keys.d.pressed = false; break;
    case "a": case "ArrowLeft":  keys.a.pressed = false; break;
  }
});

let _touchControlsInit = false;
function initTouchControls() {
  if (_touchControlsInit) return;
  _touchControlsInit = true;

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (gameOver) return;
    
    const rect = canvas.getBoundingClientRect();
    for (const touch of e.touches) {
      const x = touch.clientX - rect.left;
      const relX = x / rect.width;
      
      if (relX < 0.33) {
        keys.a.pressed = true;
      } else if (relX > 0.67) {
        keys.d.pressed = true;
      } else {
        if (player.isOnGround) {
          player.velocity.y = -3.5;
          player.isOnGround = false;
        }
      }
    }
  }, { passive: false });

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    if (e.touches.length === 0) {
      keys.a.pressed = false;
      keys.d.pressed = false;
    }
  }, { passive: false });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
  }, { passive: false });
}

setTimeout(initTouchControls, 100);