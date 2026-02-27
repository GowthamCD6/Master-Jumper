function collision({ object1, object2 }) {
  return (
    object1.position.y + object1.height >= object2.position.y &&
    object1.position.y <= object2.position.y + object2.height &&
    object1.position.x <= object2.position.x + object2.width &&
    object1.position.x + object1.width >= object2.position.x
  );
}

function platformCollision({ object1, object2 }) {
  return (
    object1.position.y + object1.height >= object2.position.y &&
    object1.position.y + object1.height <=
      object2.position.y + object2.height &&
    object1.position.x <= object2.position.x + object2.width &&
    object1.position.x + object1.width >= object2.position.x
  );
}

class CollisionBlock {
  constructor({ position, height = 16, width = 16 }) {
    this.position = position;
    this.width = width;
    this.height = height;
  }

  draw() {
    c.fillStyle = "rgba(255, 0, 0, 0.5)";
    c.fillRect(this.position.x, this.position.y, this.width, this.height);
  }

  update() {
    this.draw();
  }
}

class Sprite {
  constructor({ position, imageSrc, frameRate = 1, frameBuffer = 3, scale = 1 }) {
    this.position = position;
    this.scale = scale;
    this.loaded = false;
    this.image = new Image();
    this.image.onload = () => {
      this.width = (this.image.width / this.frameRate) * this.scale;
      this.height = this.image.height * this.scale;
      this.loaded = true;
    };
    this.image.src = imageSrc;
    this.frameRate = frameRate;
    this.currentFrame = 0;
    this.frameBuffer = frameBuffer;
    this.elapsedFrames = 0;
    this.flipX = false;
  }

  draw() {
    if (!this.image || !this.loaded) return;
    const cropbox = {
      position: { x: this.currentFrame * (this.image.width / this.frameRate), y: 0 },
      width: this.image.width / this.frameRate,
      height: this.image.height,
    };
    if (this.flipX) {
      c.translate(this.position.x + this.width, this.position.y);
      c.scale(-1, 1);
      c.drawImage(
        this.image,
        cropbox.position.x, cropbox.position.y, cropbox.width, cropbox.height,
        0, 0, this.width, this.height,
      );
      c.restore();
    } else {
      c.drawImage(
        this.image,
        cropbox.position.x, cropbox.position.y, cropbox.width, cropbox.height,
        this.position.x, this.position.y, this.width, this.height,
      );
    }
  }

  update() {
    this.draw();
    this.updateFrames();
  }

  updateFrames() {
    this.elapsedFrames++;
    if (this.elapsedFrames % this.frameBuffer === 0) {
      if (this.currentFrame < this.frameRate - 1) this.currentFrame++;
      else this.currentFrame = 0;
    }
  }
}

class Player extends Sprite {
  constructor({ position, collisionBlocks, platformCollisionBlocks, imageSrc, frameRate, scale = 0.75, animations }) {
    super({ imageSrc, frameRate, scale });
    this.position = position;
    this.velocity = { x: 0, y: 1 };
    this.collisionBlocks = collisionBlocks;
    this.platformCollisionBlocks = platformCollisionBlocks;
    this.hitbox = { position: { x: this.position.x, y: this.position.y }, width: 10, height: 10 };
    this.isOnGround = false;
    this.animations = animations;
    this.lastDirection = "right";

    for (let key in this.animations) {
      const image = new Image();
      image.src = this.animations[key].imageSrc;
      this.animations[key].image = image;
    }

    this.camerabox = { position: { x: this.position.x, y: this.position.y }, width: 60, height: 60 };
  }

  switchSprite(key) {
    if (this.image === this.animations[key].image || !this.loaded) return;
    this.currentFrame = 0;
    this.image = this.animations[key].image;
    this.frameBuffer = this.animations[key].frameBuffer;
    this.frameRate = this.animations[key].frameRate;
  }

  updateCamerabox() {
    this.camerabox = {
      position: { x: this.position.x - 22, y: this.position.y - 30 },
      width: 90, height: 90,
    };
  }

  checkForHorizontalCanvasCollision() {
    if (
      this.hitbox.position.x + this.hitbox.width + this.velocity.x >= WORLD_WIDTH ||
      this.hitbox.position.x + this.velocity.x <= 0
    ) {
      this.velocity.x = 0;
    }
  }

  shouldPanCameraToTheLeft({ canvas, camera }) {
    const cameraboxRightSide = this.camerabox.position.x + this.camerabox.width;
    const scaledDownCanvasWidth = canvas.width / GAME_SCALE;
    if (cameraboxRightSide >= WORLD_WIDTH) return;
    if (cameraboxRightSide >= scaledDownCanvasWidth + Math.abs(camera.position.x)) {
      camera.position.x -= this.velocity.x;
    }
  }

  shouldPanCameraToTheRight({ canvas, camera }) {
    if (this.camerabox.position.x <= 0) return;
    if (this.camerabox.position.x <= Math.abs(camera.position.x)) {
      camera.position.x -= this.velocity.x;
    }
  }

  shouldPanCameraDown({ canvas, camera }) {
    if (this.camerabox.position.y + this.velocity.y <= 0) return;
    if (this.camerabox.position.y <= Math.abs(camera.position.y)) {
      camera.position.y -= this.velocity.y;
    }
  }

  shouldPanCameraUp({ canvas, camera }) {
    if (this.camerabox.position.y + this.camerabox.height + this.velocity.y >= WORLD_HEIGHT) return;
    const scaledCanvasHeight = canvas.height / GAME_SCALE;
    if (this.camerabox.position.y + this.camerabox.height >= Math.abs(camera.position.y) + scaledCanvasHeight) {
      camera.position.y -= this.velocity.y;
    }
  }

  update() {
    this.updateFrames();
    this.updateHitbox();
    this.updateCamerabox();
    this.draw();
    this.position.x += this.velocity.x;
    this.updateHitbox();
    this.checkForHorizontalCollisions();
    this.applyGravity();
    this.updateHitbox();
    this.checkForVerticalCollisions();
  }

  updateHitbox() {
    this.hitbox = {
      position: { x: this.position.x + 52, y: this.position.y + 39 },
      width: 21, height: 41,
    };
  }

  checkForHorizontalCollisions() {
    for (let i = 0; i < this.collisionBlocks.length; i++) {
      const block = this.collisionBlocks[i];
      if (collision({ object1: this.hitbox, object2: block })) {
        if (this.velocity.x > 0) {
          this.velocity.x = 0;
          const offset = this.hitbox.position.x - this.position.x + this.hitbox.width;
          this.position.x = block.position.x - offset - 0.01;
          break;
        }
        if (this.velocity.x < 0) {
          this.velocity.x = 0;
          const offset = this.hitbox.position.x - this.position.x;
          this.position.x = block.position.x + block.width - offset + 0.01;
          break;
        }
      }
    }
  }

  applyGravity() {
    this.velocity.y += gravity;
    this.position.y += this.velocity.y;
  }

  checkForVerticalCollisions() {
    this.isOnGround = false;

    for (let i = 0; i < this.collisionBlocks.length; i++) {
      const block = this.collisionBlocks[i];
      if (collision({ object1: this.hitbox, object2: block })) {
        if (this.velocity.y > 0) {
          this.velocity.y = 0;
          this.isOnGround = true;
          const offset = this.hitbox.position.y - this.position.y + this.hitbox.height;
          this.position.y = block.position.y - offset - 0.01;
          break;
        }
        if (this.velocity.y < 0) {
          this.velocity.y = 0;
          const offset = this.hitbox.position.y - this.position.y;
          this.position.y = block.position.y + block.height - offset + 0.01;
          break;
        }
      }
    }

    for (let i = 0; i < this.platformCollisionBlocks.length; i++) {
      const block = this.platformCollisionBlocks[i];
      if (platformCollision({ object1: this.hitbox, object2: block })) {
        if (this.velocity.y > 0) {
          this.velocity.y = 0;
          this.isOnGround = true;
          const offset = this.hitbox.position.y - this.position.y + this.hitbox.height;
          this.position.y = block.position.y - offset - 0.01;
          break;
        }
      }
    }
  }
}

const COLLECTIBLE_SIZE = { coin: 14, heart: 14 };

class Collectible extends Sprite {
  constructor({ position, type = "coin" }) {
    const src = type === "heart" ? "./img/warrior/heart.png" : "./img/warrior/coin.png";
    super({ imageSrc: src, frameRate: 1, frameBuffer: 1, scale: 1 });
    this.position = { x: position.x, y: position.y };
    this.type = type;
    this.collected = false;
    this._displaySize = COLLECTIBLE_SIZE[type] ?? 14;
    this._baseY = position.y;
    this._bobTime = Math.random() * Math.PI * 2;
    this._popScale = 1;
    this._popping = false;
    this._popFrames = 0;
    this.radius = 7;
  }

  collect() {
    if (this.collected) return;
    this.collected = true;
    this._popping = true;
    this._popFrames = 12;
  }

  update() {
    if (this.collected && !this._popping) return;
    if (!this.collected) {
      this._bobTime += 0.06;
      this.position.y = this._baseY + Math.sin(this._bobTime) * 2;
    }
    if (this._popping) {
      this._popFrames--;
      this._popScale += 0.12;
      if (this._popFrames <= 0) this._popping = false;
    }
    this.updateFrames();
    this._drawSelf();
  }

  _drawSelf() {
    if (!this.loaded) return;
    const src = this.image.width;
    const base = this._displaySize;
    const size = base * this._popScale;
    const dx = this.position.x + (base - size) / 2;
    const dy = this.position.y + (base - size) / 2;
    const alpha = this._popping ? Math.max(0, this._popFrames / 12) : 1;
    c.save();
    c.globalAlpha = alpha;
    c.drawImage(this.image, 0, 0, src, src, dx, dy, size, size);
    c.restore();
  }
}