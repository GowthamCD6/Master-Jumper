// ============================================================
//  battleG.js - Battle World Management System
//
//  Features:
//   - Animated battleground GIF background
//   - Hero positioning and bounds in battle arena
//   - Battle world state management
//   - Monster spawning (future)
// ============================================================

class BattleWorld {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.player = null;

        // Battle world state
        this.isActive = false;
        this.entryTime = 0;

        // Battleground element
        this.battlegroundElement = null;
        this.battlegroundLoaded = false;

        // Arena bounds (scaled coordinates - GAME_SCALE = 2)
        this.bounds = {
            left: 10,
            right: 230,  // scaledW - player.width - 10
            top: 50,
            floorY: 0    // Will be calculated based on canvas height
        };

        // Hero spawn position
        this.heroSpawnX = 35;
        this.heroSpawnY = 0;  // Will be calculated

        // Score multiplier in battle world
        this.scoreMultiplier = 2;
    }

    /**
     * Initialize battle world with references
     */
    init(playerRef, canvasRef) {
        this.player = playerRef;
        this.canvas = canvasRef;
        this.ctx = canvasRef.getContext('2d');
        
        // Calculate bounds based on canvas
        const scaledW = this.canvas.width / 2;
        const scaledH = this.canvas.height / 2;
        
        this.bounds.right = scaledW - 10;
        this.bounds.floorY = scaledH - 35;  // Floor level matching blue flames
        
        this.heroSpawnY = scaledH - 35;
        
        this._createBattlegroundElement();
    }

    /**
     * Create the fullscreen battleground GIF element
     */
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

    /**
     * Enter battle world
     */
    enter() {
        this.isActive = true;
        this.entryTime = Date.now();
        
        this.showBattleground();
        this._positionHero();
    }

    /**
     * Exit battle world (if needed)
     */
    exit() {
        this.isActive = false;
        this.hideBattleground();
    }

    /**
     * Show the battleground GIF
     */
    showBattleground() {
        if (this.battlegroundElement) {
            this.battlegroundElement.style.display = 'block';
            this.battlegroundElement.style.zIndex = '1';
        }
        if (this.canvas) {
            this.canvas.style.background = 'transparent';
            this.canvas.style.position = 'relative';
            this.canvas.style.zIndex = '2';
        }
        document.body.style.background = 'transparent';
    }

    /**
     * Hide the battleground GIF
     */
    hideBattleground() {
        if (this.battlegroundElement) {
            this.battlegroundElement.style.display = 'none';
        }
        if (this.canvas) {
            this.canvas.style.background = '';
            this.canvas.style.zIndex = '';
        }
        document.body.style.background = '#111';
    }

    /**
     * Position hero at spawn point
     */
    _positionHero() {
        if (!this.player) return;
        
        const scaledH = this.canvas.height / 2;
        
        this.player.position.x = this.heroSpawnX;
        this.player.position.y = scaledH - this.player.height - 35;
        this.player.velocity.x = 0;
        this.player.velocity.y = 0;
        this.player.lastDirection = "right";
        this.player.switchSprite("Idle");
        this.player.isOnGround = true;
    }

    /**
     * Update battle world - constrain hero bounds
     */
    update() {
        if (!this.isActive || !this.player) return;

        // Keep camera at origin
        camera.position.x = 0;
        camera.position.y = 0;

        const scaledW = this.canvas.width / 2;
        const scaledH = this.canvas.height / 2;

        // Constrain hero horizontally
        if (this.player.position.x < this.bounds.left) {
            this.player.position.x = this.bounds.left;
        }
        if (this.player.position.x > scaledW - this.player.width - 10) {
            this.player.position.x = scaledW - this.player.width - 10;
        }

        // Apply floor
        const floorY = scaledH - this.player.height - 35;
        if (this.player.position.y > floorY) {
            this.player.position.y = floorY;
            this.player.velocity.y = 0;
            this.player.isOnGround = true;
        }

        // Constrain top
        if (this.player.position.y < this.bounds.top) {
            this.player.position.y = this.bounds.top;
            this.player.velocity.y = 0;
        }
    }

    /**
     * Get time spent in battle world (ms)
     */
    getTimeInBattle() {
        if (!this.isActive) return 0;
        return Date.now() - this.entryTime;
    }

    /**
     * Check if battle world is active
     */
    isInBattle() {
        return this.isActive;
    }
}

// ============================================================
//  Global Battle World Instance
// ============================================================
let battleWorld = null;

/**
 * Initialize battle world system
 */
function initBattleWorld(playerRef, canvasRef) {
    battleWorld = new BattleWorld();
    battleWorld.init(playerRef, canvasRef);
}

/**
 * Enter battle world
 */
function enterBattleWorld() {
    if (battleWorld) {
        battleWorld.enter();
    }
}

/**
 * Exit battle world
 */
function exitBattleWorld() {
    if (battleWorld) {
        battleWorld.exit();
    }
}

/**
 * Update battle world each frame
 */
function updateBattleWorld() {
    if (battleWorld) {
        battleWorld.update();
    }
}

/**
 * Check if currently in battle world
 */
function isBattleWorldActive() {
    return battleWorld ? battleWorld.isInBattle() : false;
}

/**
 * Get battle world score multiplier
 */
function getBattleScoreMultiplier() {
    return battleWorld && battleWorld.isActive ? battleWorld.scoreMultiplier : 1;
}

// Export to window for global access
if (typeof window !== 'undefined') {
    window.battleWorld = battleWorld;
    window.initBattleWorld = initBattleWorld;
    window.enterBattleWorld = enterBattleWorld;
    window.exitBattleWorld = exitBattleWorld;
    window.updateBattleWorld = updateBattleWorld;
    window.isBattleWorldActive = isBattleWorldActive;
    window.getBattleScoreMultiplier = getBattleScoreMultiplier;
}
