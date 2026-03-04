// ============================================================
//  portal.js v5 - Advanced Portal System
//
//  Features:
//   - Entry portal appears at trigger height
//   - New world with x2 score bonus
//   - Exit portal returns to normal world
//   - Invincibility on exit
//   - Smooth suck-in animations with spiral effects
//   - Timer bar for portal duration
// ============================================================

class PortalSystem {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.player = null;

        // P
        this.state = 'inactive';
        this.triggerPlatforms = 20;
        this.portalDuration = 30000;
        this.portalOpenTime = 0;
        this.hasTriggered = false;

        this.entryPortal = {
            x: 0, y: 0,
            radius: 0, maxRadius: 60,
            rotation: 0,
            particles: [],
            alpha: 0,
            spawnTime: 0,
            spawnDuration: 400 
        };

        this.exitPortal = {
            x: 0, y: 0,
            radius: 0, maxRadius: 50,
            rotation: 0,
            particles: [],
            alpha: 0,
            spawnTime: 0,
            spawnDuration: 400 
        };

        this.transition = {
            progress: 0,
            duration: 1200,
            startTime: 0,
            type: 'in' 
        };

        this.suckInAnimation = {
            active: false,
            progress: 0,
            duration: 1500, 
            startTime: 0,
            startX: 0,
            startY: 0,
            targetX: 0,
            targetY: 0,
            startScale: 1,
            type: 'in',
            spiralAngle: 0,
            spiralRadius: 0,
            portalGlow: 0,
            vortexParticles: [],
            screenDarken: 0
        };

        this.invincibilityDuration = 3000; 
        this.invincibilityTime = 0;
        this.isInvincible = false;

        this.autopilotActive = false;
        this.autopilotTargetY = 0;

        this.isNewWorld = false;
        this.worldTransition = 0;
        this.newWorldTime = 0;
        this.newWorldDuration = 20000; 

        this.playerMovingToPortal = false;

        this.bonusMultiplier = 2;

        this.exitGracePeriod = 3000;
        this.exitTime = 0;
        this.justExited = false;

        this.flashAlpha = 0; 
        this.needsScreenShake = false; 
        this.screenShakeIntensity = 5;
        this.screenShakeDuration = 300;
        this.timerBarFlash = 0;

        this.spriteLoaded = false;
        this.portalSprite = new Image();
        this.portalSprite.onload = () => {
            this.spriteLoaded = true;
        };
        this.portalSprite.onerror = () => {
        };
        this.portalSprite.src = './assets/img/portal1.png';

        this.portalFrames = [
            { x: 79, y: 118, width: 234, height: 300 },
            { x: 392, y: 109, width: 250, height: 313 },
            { x: 715, y: 108, width: 231, height: 314 },
            { x: 72, y: 504, width: 247, height: 318 },
            { x: 387, y: 505, width: 250, height: 317 },
            { x: 711, y: 504, width: 248, height: 320 },
            { x: 72, y: 899, width: 256, height: 307 },
            { x: 388, y: 906, width: 262, height: 299 },
            { x: 699, y: 904, width: 256, height: 306 }
        ];
        this.currentFrame = 0;
        this.frameTime = 0;
        this.frameDuration = 150;
        this.portalDrawSize = 100;

        this.portalColors = ['#8B5CF6', '#7C3AED', '#6D28D9', '#A78BFA', '#C4B5FD'];

        this.battlegroundLoaded = false;
        this.battlegroundSprite = new Image();
        this.battlegroundSprite.onload = () => {
            this.battlegroundLoaded = true;
        };
        this.battlegroundSprite.onerror = () => {
            console.warn('Failed to load BattleGround.gif');
        };
        this.battlegroundSprite.src = './assets/video/BattleGround.gif';

        this.battleWorldActive = false;

        this.battlegroundElement = null;

        this.savedCameraY = 0;
    }

    init(playerRef, canvasRef) {
        this.player = playerRef;
        this.canvas = canvasRef;
        this.ctx = canvasRef.getContext('2d');
        this._createBattlegroundElement();
        this._preloadPortal();
    }

    _createBattlegroundElement() {
        this.battlegroundElement = document.createElement('img');
        this.battlegroundElement.src = './assets/video/BattleGround.gif';
        this.battlegroundElement.id = 'battleground-bg';
        this.battlegroundElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            object-fit: cover;
            z-index: 0;
            display: none;
            pointer-events: none;
        `;
        this.battlegroundElement.onload = () => {
            this.battlegroundLoaded = true;
        };
        document.body.insertBefore(this.battlegroundElement, document.body.firstChild);
    }

    showBattleground() {
        if (this.battlegroundElement) {
            this.battlegroundElement.style.display = 'block';
            this.battlegroundElement.style.zIndex = '1';
        }
        if (this.canvas) {
            // Expand canvas to fullscreen width for desktop-style gameplay
            this.canvas.width = window.innerWidth;
            this.canvas.style.width = window.innerWidth + 'px';
            this.canvas.style.background = 'transparent';
            this.canvas.style.position = 'relative';
            this.canvas.style.zIndex = '2';
            // Re-apply after canvas resize resets context state
            this.ctx.imageSmoothingEnabled = false;
        }
        document.body.style.background = 'transparent';
    }

    hideBattleground() {
        if (this.battlegroundElement) {
            this.battlegroundElement.style.display = 'none';
        }
        if (this.canvas) {
            // Restore canvas to mobile width
            this.canvas.width = 480;
            const scaleX = window.innerWidth / 480;
            const scaleY = window.innerHeight / 700;
            const fitScale = Math.min(scaleX, scaleY);
            this.canvas.style.width = Math.floor(480 * fitScale) + 'px';
            this.canvas.style.background = '';
            this.canvas.style.zIndex = '';
            // Re-apply after canvas resize resets context state
            this.ctx.imageSmoothingEnabled = false;
        }
        
        // Restore hero to original size
        if (this.player) {
            this.player.scale = 0.75;
            this.player.width = (this.player.image.width / this.player.frameRate) * this.player.scale;
            this.player.height = this.player.image.height * this.player.scale;
        }
        
        document.body.style.background = '#111';
    }

    _preloadPortal() {
        if (!this.canvas || !this.player) return;
        
        this.entryPortal.x = this.player.position.x + this.player.width / 2;
        this.entryPortal.y = this.player.position.y - 150;
        this.entryPortal.radius = this.entryPortal.maxRadius;
        this.entryPortal.alpha = 0;
        this.entryPortal.rotation = 0;
        this.entryPortal.particles = [];
        
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = this.entryPortal.maxRadius + 10 + Math.random() * 20;
            this.entryPortal.particles.push({
                x: this.entryPortal.x + Math.cos(angle) * dist,
                y: this.entryPortal.y + Math.sin(angle) * dist,
                targetX: this.entryPortal.x,
                targetY: this.entryPortal.y,
                size: 2 + Math.random() * 4,
                alpha: 0, 
                life: 40 + Math.random() * 20,
                maxLife: 60,
                color: this.portalColors[Math.floor(Math.random() * this.portalColors.length)],
                angle: angle,
                speed: 0.8 + Math.random() * 1.5
            });
        }
    }

    canTrigger(platformCount) {
        return !this.hasTriggered && platformCount >= this.triggerPlatforms && this.state === 'inactive';
    }

    trigger() {
        if (this.state !== 'inactive') return;

        this.state = 'entry_spawning';
        this.entryPortal.spawnTime = Date.now();
        this.portalOpenTime = Date.now();

        this.entryPortal.x = this.player.position.x + this.player.width / 2;
        this.entryPortal.y = this.player.position.y - 120;
        this.entryPortal.alpha = 0;
        this.entryPortal.radius = 0;
        this.entryPortal.rotation = 0;
        
        for (const p of this.entryPortal.particles) {
            p.alpha = 0;
            p.x = this.entryPortal.x + Math.cos(p.angle) * (this.entryPortal.maxRadius + 20);
            p.y = this.entryPortal.y + Math.sin(p.angle) * (this.entryPortal.maxRadius + 20);
        }

        this.hasTriggered = true;
        this.flashAlpha = 0.8;
        this.needsScreenShake = true;
        this.screenShakeIntensity = 8;
        this.screenShakeDuration = 300;
    }

    getGravityMultiplier() {
        return this.isNewWorld ? 0.5 : 1;
    }

    update(currentTime) {
        if (this.flashAlpha > 0) {
            this.flashAlpha -= 0.03;
            if (this.flashAlpha < 0) this.flashAlpha = 0;
        }
       
        this._updateReleaseAnimation();
        this.checkInvincibility();
      
        if (this.state === 'inactive' || this.state === 'cooldown') return;

        const now = Date.now();

        switch (this.state) {
            case 'entry_spawning':
                this._updateEntrySpawning(now);
                break;
            case 'entry_open':
                this._updateEntryOpen(now);
                break;
            case 'transitioning_in':
                this._updateTransitionIn(now);
                break;
            case 'new_world':
                this._updateNewWorld(now);
                break;
            case 'exit_spawning':
                this._updateExitSpawning(now);
                break;
            case 'exit_open':
                this._updateExitOpen(now);
                break;
            case 'transitioning_out':
                this._updateTransitionOut(now);
                break;
        }

        this._updatePortalParticles(this.entryPortal);
        this._updatePortalParticles(this.exitPortal);
    }

    _updateEntrySpawning(now) {
        const elapsed = now - this.entryPortal.spawnTime;
        const progress = Math.min(elapsed / this.entryPortal.spawnDuration, 1);

        const ease = progress < 1 
            ? 1 - Math.pow(2, -10 * progress) * Math.cos(progress * Math.PI * 2) * (1 - progress)
            : 1;
    
        let sizeMultiplier = ease;
        if (progress > 0.3 && progress < 0.7) {
            sizeMultiplier = ease * (1 + Math.sin((progress - 0.3) * Math.PI / 0.4) * 0.15);
        }
        
        this.entryPortal.radius = this.entryPortal.maxRadius * Math.min(sizeMultiplier, 1.1);
        this.entryPortal.alpha = Math.min(ease * 1.2, 1);
        this.entryPortal.rotation += 0.08 + (progress * 0.04);

        if (progress < 0.3) {
            for (let i = 0; i < 3; i++) {
                if (Math.random() < 0.6) {
                    this._spawnPortalParticle(this.entryPortal);
                }
            }
        } else if (Math.random() < 0.3) {
            this._spawnPortalParticle(this.entryPortal);
        }

        if (progress >= 1) {
            this.state = 'entry_open';
            this.portalOpenTime = now;
            this.entryPortal.radius = this.entryPortal.maxRadius;
            this.flashAlpha = 0;
        }
    }

    _updateEntryOpen(now) {
        this.entryPortal.rotation += 0.06;

        const pulse = Math.sin(now * 0.005) * 5;
        this.entryPortal.radius = this.entryPortal.maxRadius + pulse;
        if (Math.random() < 0.4) {
            this._spawnPortalParticle(this.entryPortal);
        }

        if (this._checkPortalCollision(this.entryPortal) && !this.suckInAnimation.active) {
            this.suckInAnimation.active = true;
            this.suckInAnimation.progress = 0;
            this.suckInAnimation.startTime = now;
            this.suckInAnimation.startX = this.player.position.x;
            this.suckInAnimation.startY = this.player.position.y;
            this.suckInAnimation.targetX = this.entryPortal.x - this.player.width / 2;
            this.suckInAnimation.targetY = this.entryPortal.y - this.player.height / 2;
            this.suckInAnimation.startScale = 1;
            this.suckInAnimation.type = 'in';
            this.suckInAnimation.spiralAngle = Math.atan2(
                this.player.position.y - this.entryPortal.y,
                this.player.position.x - this.entryPortal.x
            );
            this.suckInAnimation.spiralRadius = Math.sqrt(
                Math.pow(this.player.position.x - this.entryPortal.x + this.player.width / 2, 2) +
                Math.pow(this.player.position.y - this.entryPortal.y + this.player.height / 2, 2)
            );
            this.suckInAnimation.vortexParticles = [];
            this.suckInAnimation.screenDarken = 0;
            this.suckInAnimation.portalGlow = 0;
            this.playerMovingToPortal = false;
         
            this.player.portalRotation = 0;
            this.player.portalStretchX = 1;
            this.player.portalStretchY = 1;

            this.savedCameraY = camera.position.y;
        }

        if (this.suckInAnimation.active && this.suckInAnimation.type === 'in') {
            this._updateSuckInAnimation(now);
        }
    }

    _updateTransitionIn(now) {
        const elapsed = now - this.transition.startTime;
        this.transition.progress = Math.min(elapsed / this.transition.duration, 1);
        this.entryPortal.rotation += 0.15;
        this.worldTransition = this._easeInOut(this.transition.progress);

        if (this.transition.progress >= 1) {
            this.isNewWorld = true;
            this.battleWorldActive = true;
            this.worldTransition = 1;
            this.state = 'new_world';
            this.newWorldTime = now;

            this.showBattleground();

            camera.position.x = 0;
            camera.position.y = 0;

            const HERO_H = 41.5;
            const scaledH = this.canvas.height / GAME_SCALE;
            const scaledW = this.canvas.width / GAME_SCALE; 
            const BATTLE_FLOOR_Y = Math.round(scaledH * 0.85) - HERO_H;

            this.player.position.x = Math.round(scaledW / 2) - 30;
            this.player.position.y = BATTLE_FLOOR_Y;
            this.player.velocity.x = 0;
            this.player.velocity.y = 0;
            this.player.lastDirection = "right";
            
            // Increas
            this.player.scale = 1.5; 
            this.player.width = (this.player.image.width / this.player.frameRate) * this.player.scale;
            this.player.height = this.player.image.height * this.player.scale;
            
            this.player.switchSprite("Idle");
            this.player.isOnGround = true;

            this._startReleaseAnimation();

            this.entryPortal.alpha = 0;
            this.entryPortal.radius = 0;
            this.entryPortal.particles = [];
        }
    }

    _updateNewWorld(now) {
        this.battleWorldActive = true;
        this.exitPortal.alpha = 0;
        this.exitPortal.radius = 0;
        camera.position.x = 0;
        camera.position.y = 0;
    }

    _updateExitSpawning(now) {
        const elapsed = now - this.exitPortal.spawnTime;
        const progress = Math.min(elapsed / this.exitPortal.spawnDuration, 1);

        const ease = progress < 1 
            ? 1 - Math.pow(2, -10 * progress) * Math.cos(progress * Math.PI * 2) * (1 - progress)
            : 1;
        
        let sizeMultiplier = ease;
        if (progress > 0.3 && progress < 0.7) {
            sizeMultiplier = ease * (1 + Math.sin((progress - 0.3) * Math.PI / 0.4) * 0.15);
        }
        
        this.exitPortal.radius = this.exitPortal.maxRadius * Math.min(sizeMultiplier, 1.1);
        this.exitPortal.alpha = Math.min(ease * 1.2, 1);
        this.exitPortal.rotation += 0.08 + (progress * 0.04);

        if (progress < 0.3) {
            for (let i = 0; i < 3; i++) {
                if (Math.random() < 0.6) {
                    this._spawnPortalParticle(this.exitPortal);
                }
            }
        } else if (Math.random() < 0.3) {
            this._spawnPortalParticle(this.exitPortal);
        }

        if (progress >= 1) {
            this.state = 'exit_open';
            this.exitPortal.radius = this.exitPortal.maxRadius;
        }
    }

    _updateExitOpen(now) {
        this.exitPortal.rotation += 0.06;

        const pulse = Math.sin(now * 0.005) * 5;
        this.exitPortal.radius = this.exitPortal.maxRadius + pulse;

        if (Math.random() < 0.4) {
            this._spawnPortalParticle(this.exitPortal);
        }

        this.exitPortal.x = this.player.position.x + this.player.width / 2;
        this.exitPortal.y = this.player.position.y - 120;

        if (this._checkPortalCollision(this.exitPortal) && !this.suckInAnimation.active) {
            this.suckInAnimation.active = true;
            this.suckInAnimation.progress = 0;
            this.suckInAnimation.startTime = now;
            this.suckInAnimation.startX = this.player.position.x;
            this.suckInAnimation.startY = this.player.position.y;
            this.suckInAnimation.targetX = this.exitPortal.x - this.player.width / 2;
            this.suckInAnimation.targetY = this.exitPortal.y - this.player.height / 2;
            this.suckInAnimation.startScale = 1;
            this.suckInAnimation.type = 'out';
            this.suckInAnimation.spiralAngle = Math.atan2(
                this.player.position.y - this.exitPortal.y,
                this.player.position.x - this.exitPortal.x
            );
            this.suckInAnimation.spiralRadius = Math.sqrt(
                Math.pow(this.player.position.x - this.exitPortal.x + this.player.width / 2, 2) +
                Math.pow(this.player.position.y - this.exitPortal.y + this.player.height / 2, 2)
            );
            this.suckInAnimation.vortexParticles = [];
            this.suckInAnimation.screenDarken = 0;
            this.suckInAnimation.portalGlow = 0;
            
            this.player.portalRotation = 0;
            this.player.portalStretchX = 1;
            this.player.portalStretchY = 1;
        }

        if (this.suckInAnimation.active && this.suckInAnimation.type === 'out') {
            this._updateSuckInAnimation(now);
        }
    }

    _updateTransitionOut(now) {
        const elapsed = now - this.transition.startTime;
        this.transition.progress = Math.min(elapsed / this.transition.duration, 1);
        this.exitPortal.rotation += 0.15;
        this.worldTransition = 1 - this._easeInOut(this.transition.progress);

        if (this.transition.progress >= 1) {
            this.isNewWorld = false;
            this.worldTransition = 0;
            this.state = 'cooldown';

            this.player.position.x = WORLD_WIDTH / 2 - this.player.width / 2;
            this.player.position.y = WORLD_HEIGHT - 200;
            this.player.velocity.x = 0;
            this.player.velocity.y = 0;

            camera.position.y = this.savedCameraY;

            this._startReleaseAnimation();

            this.entryPortal.alpha = 0;
            this.entryPortal.radius = 0;
            this.exitPortal.alpha = 0;
            this.exitPortal.radius = 0;
            this.entryPortal.particles = [];
            this.exitPortal.particles = [];

            this.justExited = true;
            this.exitTime = Date.now();

            this.isInvincible = true;
            this.invincibilityTime = Date.now();

            this.triggerPlatforms += 10;
            this.hasTriggered = false;
        }
    }

    _closePortal() {
        this.state = 'cooldown';
        this.entryPortal.alpha = 0;
        this.entryPortal.radius = 0;
        this.entryPortal.particles = [];
        this.playerMovingToPortal = false;

        this.triggerPlatforms += 5;
        this.hasTriggered = false;
    }

    _checkPortalCollision(portal) {
        if (portal.alpha < 0.5) return false;

        const playerCX = this.player.position.x + this.player.width / 2;
        const playerCY = this.player.position.y + this.player.height / 2;
        const dx = playerCX - portal.x;
        const dy = playerCY - portal.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < portal.radius + 30;
    }

    _spawnPortalParticle(portal) {
        if (portal.particles.length >= 20) return;
        
        const angle = Math.random() * Math.PI * 2;
        const dist = portal.radius + 10 + Math.random() * 20;
        portal.particles.push({
            x: portal.x + Math.cos(angle) * dist,
            y: portal.y + Math.sin(angle) * dist,
            targetX: portal.x,
            targetY: portal.y,
            size: 2 + Math.random() * 4,
            alpha: 0.8,
            life: 40 + Math.random() * 20,
            maxLife: 60,
            color: this.portalColors[Math.floor(Math.random() * this.portalColors.length)],
            angle: angle,
            speed: 0.8 + Math.random() * 1.5
        });
    }

    _updatePortalParticles(portal) {
        for (let i = portal.particles.length - 1; i >= 0; i--) {
            const p = portal.particles[i];

            p.angle += 0.08;
            const currentDist = Math.sqrt(
                Math.pow(p.x - portal.x, 2) + Math.pow(p.y - portal.y, 2)
            );

            if (currentDist > 5) {
                const dx = portal.x - p.x;
                const dy = portal.y - p.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                p.x += (dx / len) * p.speed + Math.cos(p.angle) * 1.5;
                p.y += (dy / len) * p.speed + Math.sin(p.angle) * 1.5;
            }

            p.life--;
            p.alpha = (p.life / p.maxLife) * 0.8;
            p.size *= 0.98;

            if (p.life <= 0 || currentDist < 5) {
                portal.particles.splice(i, 1);
            }
        }
    }

    _easeInOut(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    _updateSuckInAnimation(now) {
        const elapsed = now - this.suckInAnimation.startTime;
        this.suckInAnimation.progress = Math.min(elapsed / this.suckInAnimation.duration, 1);
        const t = this.suckInAnimation.progress;

        const portal = this.suckInAnimation.type === 'in' ? this.entryPortal : this.exitPortal;

        const smoothEaseInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const smoothEaseIn = t => t * t * t; 
        const gentleEase = t => 1 - Math.pow(1 - t, 2); 

        const positionProgress = smoothEaseIn(t);
        const scaleProgress = smoothEaseInOut(t);
        
        const spiralSpeed = 0.015 + t * 0.02;
        this.suckInAnimation.spiralAngle += spiralSpeed;
        
        const startRadius = this.suckInAnimation.spiralRadius * 0.5;
        const currentRadius = startRadius * (1 - positionProgress);
        
        const targetX = portal.x - this.player.width / 2;
        const targetY = portal.y - this.player.height / 2;
        const startX = this.suckInAnimation.startX;
        const startY = this.suckInAnimation.startY;
        
        const spiralOffsetX = Math.cos(this.suckInAnimation.spiralAngle) * currentRadius;
        const spiralOffsetY = Math.sin(this.suckInAnimation.spiralAngle) * currentRadius;
        
        this.player.position.x = startX + (targetX - startX) * positionProgress + spiralOffsetX;
        this.player.position.y = startY + (targetY - startY) * positionProgress + spiralOffsetY;
        this.player.suckScale = 1 - (scaleProgress * 0.9);

        const rotationSpeed = 1.5 + t * 1.5;
        this.player.portalRotation = (this.player.portalRotation || 0) + rotationSpeed;

        const stretchProgress = t > 0.6 ? gentleEase((t - 0.6) / 0.4) : 0;
        const angleToPortal = Math.atan2(
            portal.y - (this.player.position.y + this.player.height / 2),
            portal.x - (this.player.position.x + this.player.width / 2)
        );
        this.player.portalStretchX = 1 + stretchProgress * 0.3 * Math.abs(Math.cos(angleToPortal));
        this.player.portalStretchY = 1 - stretchProgress * 0.2 * Math.abs(Math.cos(angleToPortal));

        this.suckInAnimation.screenDarken = smoothEaseIn(t) * 0.3;
        this.suckInAnimation.portalGlow = smoothEaseIn(t);

        this.player.velocity.x = 0;
        this.player.velocity.y = 0;

        if (Math.random() < 0.2 + t * 0.3) {
            this._spawnVortexParticle(portal);
        }

        this._updateVortexParticles(portal);
        portal.rotation += 0.05 + t * 0.1;

        if (this.suckInAnimation.progress >= 1) {
            this.suckInAnimation.active = false;
            this.player.suckScale = 1;
            this.player.portalRotation = 0;
            this.player.portalStretchX = 1;
            this.player.portalStretchY = 1;
            this.suckInAnimation.vortexParticles = [];

            if (this.suckInAnimation.type === 'in') {
                this.state = 'transitioning_in';
                this.transition.startTime = now;
                this.transition.progress = 0;
                this.transition.type = 'in';
            } else {
                this.state = 'transitioning_out';
                this.transition.startTime = now;
                this.transition.progress = 0;
                this.transition.type = 'out';
            }
        }
    }

    _spawnVortexParticle(portal) {
        if (this.suckInAnimation.vortexParticles.length >= 30) return;
        
        const angle = Math.random() * Math.PI * 2;
        const dist = portal.radius + 30 + Math.random() * 60;
        this.suckInAnimation.vortexParticles.push({
            x: portal.x + Math.cos(angle) * dist,
            y: portal.y + Math.sin(angle) * dist,
            angle: angle,
            dist: dist,
            size: 2 + Math.random() * 6,
            alpha: 0.8 + Math.random() * 0.2,
            speed: 3 + Math.random() * 4,
            rotationSpeed: 0.1 + Math.random() * 0.15,
            color: this.portalColors[Math.floor(Math.random() * this.portalColors.length)],
            life: 1
        });
    }

    _updateVortexParticles(portal) {
        for (let i = this.suckInAnimation.vortexParticles.length - 1; i >= 0; i--) {
            const p = this.suckInAnimation.vortexParticles[i];
            
            p.angle += p.rotationSpeed;
            p.dist -= p.speed;
            
            p.x = portal.x + Math.cos(p.angle) * p.dist;
            p.y = portal.y + Math.sin(p.angle) * p.dist;
            
            p.life = p.dist / 100;
            p.alpha = p.life * 0.8;
            p.size *= 0.98;
            
            if (p.dist < 5 || p.alpha < 0.05) {
                this.suckInAnimation.vortexParticles.splice(i, 1);
            }
        }
    }

    _startReleaseAnimation() {
        this.player.releaseAnimation = {
            active: true,
            progress: 0,
            startTime: Date.now(),
            duration: 600
        };
        this.player.suckScale = 0.3;
    }

    _updateReleaseAnimation() {
        if (!this.player || !this.player.releaseAnimation || !this.player.releaseAnimation.active) return;

        const elapsed = Date.now() - this.player.releaseAnimation.startTime;
        const progress = Math.min(elapsed / this.player.releaseAnimation.duration, 1);

        const ease = 1 - Math.pow(1 - progress, 3);
        this.player.suckScale = 0.3 + (0.7 * ease);

        if (progress > 0.7) {
            const bounceProgress = (progress - 0.7) / 0.3;
            const bounce = Math.sin(bounceProgress * Math.PI) * 0.1;
            this.player.suckScale = Math.min(1.1, this.player.suckScale + bounce);
        }

        if (progress >= 1) {
            this.player.releaseAnimation.active = false;
            this.player.suckScale = 1;
        }
    }

    checkInvincibility() {
        if (!this.isInvincible) return false;

        const elapsed = Date.now() - this.invincibilityTime;
        if (elapsed >= this.invincibilityDuration) {
            this.isInvincible = false;
            this.autopilotActive = false;
            return false;
        }
        return true;
    }

    getInvincibilityAlpha() {
        if (!this.isInvincible) return 1;
        const elapsed = Date.now() - this.invincibilityTime;
        const remaining = this.invincibilityDuration - elapsed;
        const flashSpeed = remaining < 1000 ? 0.02 : 0.01;
        return 0.5 + Math.sin(elapsed * flashSpeed) * 0.5;
    }

    _drawInvincibilityIndicator(ctx) {
        const elapsed = Date.now() - this.invincibilityTime;
        const remaining = Math.max(0, this.invincibilityDuration - elapsed);
        const seconds = Math.ceil(remaining / 1000);

        ctx.save();
        const pulse = Math.sin(elapsed * 0.01) * 0.2 + 0.8;

        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';

        ctx.fillStyle = '#34D399';
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;

        const text = 'PROTECTED ' + seconds + 's';
        const y = 70;
        ctx.strokeText(text, this.canvas.width / 2, y);
        ctx.fillText(text, this.canvas.width / 2, y);

        const barWidth = 80;
        const barHeight = 4;
        const barX = (this.canvas.width - barWidth) / 2;
        const barY = y + 8;
        const progress = remaining / this.invincibilityDuration;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#34D399';
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);

        ctx.restore();
    }

    draw() {
        const ctx = this.ctx;
        if (!ctx) return;

        if (this.suckInAnimation.active && this.suckInAnimation.screenDarken > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(0, 0, 0, ${this.suckInAnimation.screenDarken})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.restore();
        }

        if (this.isInvincible) {
            this._drawInvincibilityIndicator(ctx);
        }

        if (this.state === 'inactive' || this.state === 'cooldown') return;

        if (this.suckInAnimation.active && this.suckInAnimation.vortexParticles.length > 0) {
            this._drawVortexParticles(ctx);
        }

        if (this.state === 'transitioning_in' || this.state === 'transitioning_out') {
            this._drawTransitionEffect(ctx);
        }

        if (this.entryPortal.alpha > 0) {
            const extraGlow = (this.suckInAnimation.active && this.suckInAnimation.type === 'in') 
                ? this.suckInAnimation.portalGlow : 0;
            this._drawPortal(ctx, this.entryPortal, 'ENTER', extraGlow);
        }

        if (this.exitPortal.alpha > 0) {
            const extraGlow = (this.suckInAnimation.active && this.suckInAnimation.type === 'out') 
                ? this.suckInAnimation.portalGlow : 0;
            this._drawPortal(ctx, this.exitPortal, 'EXIT', extraGlow);
        }
    }

    _drawVortexParticles(ctx) {
        ctx.save();
        for (const p of this.suckInAnimation.vortexParticles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            
            const trailLength = p.speed * 3;
            const trailAngle = p.angle + Math.PI;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.size * 0.6;
            ctx.globalAlpha = p.alpha * 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(
                p.x + Math.cos(trailAngle) * trailLength,
                p.y + Math.sin(trailAngle) * trailLength
            );
            ctx.stroke();
        }
        ctx.restore();
    }

    _drawPortal(ctx, portal, label, extraGlow = 0) {
        ctx.save();
        ctx.globalAlpha = portal.alpha;

        for (const p of portal.particles) {
            ctx.globalAlpha = p.alpha * portal.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = portal.alpha;

        const glowRadius = portal.radius * (1.5 + extraGlow * 0.8);
        const glowGrad = ctx.createRadialGradient(
            portal.x, portal.y, portal.radius * 0.3,
            portal.x, portal.y, glowRadius
        );
        glowGrad.addColorStop(0, this.portalColors[0] + (extraGlow > 0 ? 'AA' : '50'));
        glowGrad.addColorStop(0.5, this.portalColors[1] + (extraGlow > 0 ? '66' : '25'));
        glowGrad.addColorStop(1, this.portalColors[0] + '00');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(portal.x, portal.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        const scale = (portal.radius / portal.maxRadius) * (1 + extraGlow * 0.2);

        const now = Date.now();
        if (now - this.frameTime > this.frameDuration) {
            this.currentFrame = (this.currentFrame + 1) % this.portalFrames.length;
            this.frameTime = now;
        }

        const frame = this.portalFrames[this.currentFrame];
        
        const aspectRatio = frame.width / frame.height;
        const drawH = this.portalDrawSize * scale;
        const drawW = drawH * aspectRatio;

        ctx.save();
        ctx.globalAlpha = portal.alpha;
        ctx.translate(portal.x, portal.y);
        if (this.spriteLoaded && this.portalSprite) {
            ctx.drawImage(
                this.portalSprite,
                frame.x, frame.y, frame.width, frame.height,
                -drawW / 2, -drawH / 2,
                drawW, drawH
            );
        }
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = portal.alpha;
        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 2;
        const labelY = portal.y + (drawH / 2) + 16;
        ctx.strokeText(label, portal.x, labelY);
        ctx.fillText(label, portal.x, labelY);
        ctx.restore();

        ctx.restore();
    }

    _drawTimerBar(ctx) {
        const elapsed = Date.now() - this.portalOpenTime;
        const remaining = Math.max(0, this.portalDuration - elapsed);
        const progress = remaining / this.portalDuration;

        const barWidth = this.canvas.width * 0.5;
        const barHeight = 8;
        const barX = (this.canvas.width - barWidth) / 2;
        const barY = 32;

        ctx.save();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

        const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth * progress, barY);
        if (remaining < 5000) {
            const flash = this.timerBarFlash;
            gradient.addColorStop(0, `rgba(255, ${Math.floor(80 * flash)}, 0, 1)`);
            gradient.addColorStop(1, '#FF0000');
        } else {
            gradient.addColorStop(0, '#8B5CF6');
            gradient.addColorStop(1, '#A78BFA');
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);

        ctx.strokeStyle = '#C4B5FD';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

        const seconds = Math.ceil(remaining / 1000);
        ctx.font = 'bold 10px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText('PORTAL ' + seconds + 's', this.canvas.width / 2, barY - 4);

        ctx.restore();
    }

    _drawExitCountdown(ctx) {
        const elapsed = Date.now() - this.newWorldTime;
        const remaining = Math.max(0, this.newWorldDuration - elapsed);
        const seconds = Math.ceil(remaining / 1000);

        ctx.save();
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = '#A78BFA';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        const text = 'EXIT PORTAL IN ' + seconds + 's';
        ctx.strokeText(text, this.canvas.width / 2, 50);
        ctx.fillText(text, this.canvas.width / 2, 50);
        ctx.restore();
    }

    _drawTransitionEffect(ctx) {
        ctx.save();
        const p = this.transition.progress;

        const portal = this.transition.type === 'in' ? this.entryPortal : this.exitPortal;
        const centerX = portal.x;
        const centerY = portal.y;

        const maxRadius = Math.sqrt(
            this.canvas.width * this.canvas.width + this.canvas.height * this.canvas.height
        );

        if (this.transition.type === 'in') {
            const radius = maxRadius * this._easeInOut(p);
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.clip();
            this._drawNewWorldBackground(ctx);
        } else {
            const radius = maxRadius * (1 - this._easeInOut(p));
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.clip();
            this._drawNewWorldBackground(ctx);
        }

        if (p > 0.4 && p < 0.6) {
            const flashAlpha = 1 - Math.abs(p - 0.5) / 0.1;
            ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.6})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        ctx.restore();
    }

    drawNewWorldBackground(ctx) {
        if (this.worldTransition <= 0) return;
        this._drawNewWorldBackground(ctx);
    }

    _drawNewWorldBackground(ctx) {
        ctx.save();

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.restore();
    }

    drawNewWorldGround(ctx, groundY) {
        const gradient = ctx.createLinearGradient(0, groundY, 0, this.canvas.height);
        gradient.addColorStop(0, '#2D1B69');
        gradient.addColorStop(0.3, '#1A0F40');
        gradient.addColorStop(1, '#0D0628');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, groundY, this.canvas.width, this.canvas.height - groundY);

        ctx.strokeStyle = '#A78BFA';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(this.canvas.width, groundY);
        ctx.stroke();

        const now = Date.now();
        for (let x = 10; x < this.canvas.width; x += 35) {
            const h = 10 + Math.sin(x * 0.1 + now * 0.001) * 5;
            const glow = 0.3 + Math.sin(now * 0.003 + x * 0.05) * 0.2;
            ctx.globalAlpha = glow;
            ctx.fillStyle = '#7C3AED';
            ctx.beginPath();
            ctx.moveTo(x, groundY);
            ctx.lineTo(x + 5, groundY - h);
            ctx.lineTo(x + 10, groundY);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    isInNewWorld() {
        return this.isNewWorld;
    }

    isInBattleWorld() {
        return this.battleWorldActive && this.isNewWorld;
    }

    getScoreMultiplier() {
        return this.isNewWorld ? this.bonusMultiplier : 1;
    }

    isTransitioning() {
        return this.state === 'transitioning_in' || this.state === 'transitioning_out';
    }

    isSuckingIn() {
        return this.suckInAnimation.active;
    }

    reset() {
        this.state = 'inactive';
        this.hasTriggered = false;
        this.triggerPlatforms = 20;
        this.isNewWorld = false;
        this.battleWorldActive = false;
        this.worldTransition = 0;
        this.playerMovingToPortal = false;
        this.justExited = false;
        this.exitTime = 0;
        this.flashAlpha = 0;
        this.needsScreenShake = false;
        this.entryPortal.alpha = 0;
        this.entryPortal.radius = 0;
        this.entryPortal.particles = [];
        this.exitPortal.alpha = 0;
        this.exitPortal.radius = 0;
        this.exitPortal.particles = [];
        this.timerBarFlash = 0;
        this.transition.progress = 0;
        this.suckInAnimation.active = false;
        this.suckInAnimation.progress = 0;
        this.isInvincible = false;
        this.invincibilityTime = 0;
        this.autopilotActive = false;

        this.hideBattleground();
        
        if (this.player) {
            this.player.suckScale = 1;
            this.player.releaseAnimation = null;
        }
        
        this._preloadPortal();
    }
}

let portalSystem;
try {
    portalSystem = new PortalSystem();
} catch (e) {
    console.error('Failed to create PortalSystem:', e);
    portalSystem = null;
}

let portalInBattle = false;
let _portalState = 'inactive';

let _platformsVisited = new Set();
let _lastPlayerY = 0;
let currentPlatformCount = 0;

function _getPlatformCount() {
    if (typeof platformGroups === 'undefined' || typeof player === 'undefined') {
        return 0;
    }
    
    const playerBottomY = player.position.y + player.height;
    
    platformGroups.forEach((platform, index) => {
        if (playerBottomY <= platform.y + 20 && !_platformsVisited.has(index)) {
            _platformsVisited.add(index);
        }
    });
    
    return _platformsVisited.size;
}

let currentHeightMeters = 0;

function updatePortal() {
    if (!portalSystem) return;
    
    if (!portalSystem.canvas && typeof player !== 'undefined' && typeof canvas !== 'undefined') {
        portalSystem.init(player, canvas);
    }

    const platformCount = _getPlatformCount();
    currentPlatformCount = platformCount;
    currentHeightMeters = platformCount;
    
    if (portalSystem.canTrigger(platformCount)) {
        portalSystem.trigger();
    }

    portalSystem.update(Date.now());

    if (portalSystem.isInvincible) {
        heroInvincible = 999;
    }

    portalInBattle = portalSystem.isTransitioning() || portalSystem.isSuckingIn();

    if (portalSystem.isSuckingIn()) {
        _portalState = 'entering';
    } else if (portalSystem.isTransitioning()) {
        _portalState = 'battle';
    } else if (portalSystem.isNewWorld) {
        _portalState = 'battle';
    } else if (portalSystem.state === 'cooldown') {
        _portalState = 'dismissed';
    } else {
        _portalState = portalSystem.state;
    }
}

function drawPortalFlash() {
    if (!portalSystem) return;
    
    if (!portalSystem.ctx && typeof c !== 'undefined') {
        portalSystem.ctx = c;
    }
    
    c.save();
    
    c.scale(GAME_SCALE, GAME_SCALE);
    c.translate(camera.position.x, camera.position.y);
    
    if (portalSystem.entryPortal.alpha > 0 || portalSystem.exitPortal.alpha > 0) {
        const ctx = c;
        
        if (portalSystem.entryPortal.alpha > 0) {
            const extraGlow = (portalSystem.suckInAnimation.active && portalSystem.suckInAnimation.type === 'in') 
                ? portalSystem.suckInAnimation.portalGlow : 0;
            portalSystem._drawPortal(ctx, portalSystem.entryPortal, 'ENTER', extraGlow);
        }

        if (portalSystem.exitPortal.alpha > 0) {
            const extraGlow = (portalSystem.suckInAnimation.active && portalSystem.suckInAnimation.type === 'out') 
                ? portalSystem.suckInAnimation.portalGlow : 0;
            portalSystem._drawPortal(ctx, portalSystem.exitPortal, 'EXIT', extraGlow);
        }

        if (portalSystem.suckInAnimation.active && portalSystem.suckInAnimation.vortexParticles.length > 0) {
            portalSystem._drawVortexParticles(ctx);
        }
    }
    
    c.restore();
    
    if (portalSystem.suckInAnimation.active && portalSystem.suckInAnimation.screenDarken > 0) {
        c.save();
        c.fillStyle = `rgba(0, 0, 0, ${portalSystem.suckInAnimation.screenDarken})`;
        c.fillRect(0, 0, canvas.width, canvas.height);
        c.restore();
    }

    if (portalSystem.flashAlpha > 0) {
        c.save();
        c.fillStyle = `rgba(139, 92, 246, ${portalSystem.flashAlpha})`;
        c.fillRect(0, 0, canvas.width, canvas.height);
        c.restore();
    }

    if (portalSystem.isInvincible) {
        portalSystem._drawInvincibilityIndicator(c);
    }

    if (portalSystem.state === 'transitioning_in' || portalSystem.state === 'transitioning_out') {
        portalSystem._drawTransitionEffect(c);
    }

    if (portalSystem.isNewWorld) {
        c.save();
        const now = Date.now();
        const bounce = Math.sin(now * 0.003) * 3;
        c.font = 'bold 14px Arial';
        c.textAlign = 'center';
        c.fillStyle = '#C4B5FD';
        c.strokeStyle = 'rgba(0,0,0,0.5)';
        c.lineWidth = 2;
        const text = 'SPACE BATTLE x2 SCORE';
        c.strokeText(text, canvas.width / 2, 25 + bounce);
        c.fillText(text, canvas.width / 2, 25 + bounce);
        c.restore();
    }
}

function isPortalActive() {
    if (!portalSystem) return false;
    return portalSystem.state !== 'inactive' && portalSystem.state !== 'cooldown';
}

function isInNewWorld() {
    if (!portalSystem) return false;
    return portalSystem.isNewWorld;
}

function isInBattleWorld() {
    if (!portalSystem) return false;
    return portalSystem.isInBattleWorld();
}

function getPortalScoreMultiplier() {
    if (!portalSystem) return 1;
    return portalSystem.getScoreMultiplier();
}

if (typeof window !== 'undefined') {
    window.updatePortal = updatePortal;
    window.drawPortalFlash = drawPortalFlash;
    window.isPortalActive = isPortalActive;
    window.isInNewWorld = isInNewWorld;
    window.isInBattleWorld = isInBattleWorld;
    window.getPortalScoreMultiplier = getPortalScoreMultiplier;
    Object.defineProperty(window, 'currentPlatformCount', {
        get: function() { return currentPlatformCount; }
    });
    Object.defineProperty(window, 'currentHeightMeters', {
        get: function() { return currentHeightMeters; }
    });
    window.portalSystem = portalSystem;
}