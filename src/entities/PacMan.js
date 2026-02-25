import { TILES } from '../world/TileMap.js';
import { EventBus } from '../core/EventBus.js';

export class PacMan {
    /**
     * @param {number} startTileX 
     * @param {number} startTileY 
     */
    constructor(startTileX, startTileY) {
        this.tileSize = 8;
        this.baseSpeed = 75.5; // pixels per second
        this.speedMultiplier = 0.8; // Level 1 normal speed

        // Start position
        this.tileX = startTileX;
        this.tileY = startTileY;
        
        // Exact pixel position (center of tile)
        const half = this.tileSize / 2;
        this.x = (this.tileX * this.tileSize) + half;
        this.y = (this.tileY * this.tileSize) + half;

        // Vectors
        this.dir = { x: -1, y: 0 }; // Starts facing left
        this.nextDir = { x: -1, y: 0 };
        
        // Animation
        this.mouthAngle = 0;
        this.mouthDir = 1;
        this.mouthSpeed = 400; // Degrees per second
        this.facingAngle = 180; // Facing left initially

        // State
        this.isAlive = true;
    }

    resetRotation() {
        if (this.dir.x === 1) this.facingAngle = 0;
        else if (this.dir.x === -1) this.facingAngle = 180;
        else if (this.dir.y === 1) this.facingAngle = 90;
        else if (this.dir.y === -1) this.facingAngle = 270;
    }

    /**
     * @param {number} dt 
     * @param {import('../core/InputHandler.js').InputHandler} input 
     * @param {import('../world/TileMap.js').TileMap} tileMap 
     * @param {import('../world/DotManager.js').DotManager} dotManager 
     */
    update(dt, input, tileMap, dotManager) {
        if (!this.isAlive) return;

        // Process Input Queue
        if (input.dir.x !== 0 || input.dir.y !== 0) {
            this.nextDir = { x: input.dir.x, y: input.dir.y };
        }

        // 1. Instant reverse check (Pac-Man can always reverse instantly without hitting center)
        if (this.dir.x === -this.nextDir.x && this.dir.x !== 0 || 
            this.dir.y === -this.nextDir.y && this.dir.y !== 0) {
            this.dir = { x: this.nextDir.x, y: this.nextDir.y };
            this.resetRotation();
        }

        const speed = this.baseSpeed * this.speedMultiplier * dt;
        let isMoving = false;

        // Current tile center in pixels
        const half = this.tileSize / 2;
        const cx = (this.tileX * this.tileSize) + half;
        const cy = (this.tileY * this.tileSize) + half;

        // Distance to the center of the current tile
        const dx = this.x - cx;
        const dy = this.y - cy;
        const distToCenter = Math.hypot(dx, dy);

        // Turn Window: ±4px
        if (distToCenter <= 4.0) {
            // Check if we reached/passed the center to snap exactly
            // If moving right (dir.x=1), and dx crossed from <0 to >=0, we hit center
            const movingRightHit  = this.dir.x === 1  && dx >= 0 && dx - speed < 0;
            const movingLeftHit   = this.dir.x === -1 && dx <= 0 && dx + speed > 0;
            const movingDownHit   = this.dir.y === 1  && dy >= 0 && dy - speed < 0;
            const movingUpHit     = this.dir.y === -1 && dy <= 0 && dy + speed > 0;
            
            // If we are exactly at center or just crossed it, we can turn
            if (movingRightHit || movingLeftHit || movingDownHit || movingUpHit || distToCenter < 1.0) {
                let turned = false;

                // Attempt nextDir if different
                if (this.nextDir.x !== this.dir.x || this.nextDir.y !== this.dir.y) {
                    const checkX = this.tileX + this.nextDir.x;
                    const checkY = this.tileY + this.nextDir.y;
                    if (!tileMap.isSolidForPacman(checkX, checkY)) {
                        // Valid turn: snap to center and change dir
                        this.x = cx;
                        this.y = cy;
                        this.dir = { x: this.nextDir.x, y: this.nextDir.y };
                        this.resetRotation();
                        // Carry over remaining movement to prevent stutter
                        const overshoot = Math.abs(dx * this.dir.x + dy * this.dir.y);
                        this.x += this.dir.x * overshoot;
                        this.y += this.dir.y * overshoot;
                        turned = true;
                    }
                }

                // If we didn't turn, check if going straight is still valid
                if (!turned) {
                    const straightX = this.tileX + this.dir.x;
                    const straightY = this.tileY + this.dir.y;
                    if (tileMap.isSolidForPacman(straightX, straightY)) {
                        // Stop at center
                        this.x = cx;
                        this.y = cy;
                    } else {
                        // Clear path, keep going
                        this.x += this.dir.x * speed;
                        this.y += this.dir.y * speed;
                        isMoving = true;
                    }
                } else {
                    isMoving = true;
                }
            } else {
                // Not at center yet, keep moving
                this.x += this.dir.x * speed;
                this.y += this.dir.y * speed;
                isMoving = true;
            }
        } else {
            // Outside turn window, just move
            this.x += this.dir.x * speed;
            this.y += this.dir.y * speed;
            isMoving = true;
        }

        // Update exact tile position correctly for wrapping
        this.tileX = Math.floor(this.x / this.tileSize);
        this.tileY = Math.floor(this.y / this.tileSize);

        // Tunnel Warp Logic
        if (this.tileX < 0) {
            this.x = (tileMap.width * this.tileSize) - 1;
            this.tileX = tileMap.width - 1;
        } else if (this.tileX >= tileMap.width) {
            this.x = 0;
            this.tileX = 0;
        }

        // Dot Collision (trigger if within 3px of tile center)
        if (distToCenter <= 3.0) {
            const consumed = dotManager.eatDot(this.tileX, this.tileY);
            if (consumed === TILES.POWER_PELLET) {
                EventBus.emit('POWER_PELLET_EATEN');
            } else if (consumed === TILES.DOT) {
                EventBus.emit('DOT_EATEN');
            }
        }
        // Animation
        if (isMoving) {
            this.mouthAngle += this.mouthSpeed * this.mouthDir * dt;
            if (this.mouthAngle >= 45) {
                this.mouthAngle = 45;
                this.mouthDir = -1;
            } else if (this.mouthAngle <= 0) {
                this.mouthAngle = 0;
                this.mouthDir = 1;
            }
        } else {
            this.mouthAngle = 20; // Stopped pose
        }
    }

    render(ctx) {
        if (!this.isAlive) return; // Will render death sequence later

        // Pacman Body
        ctx.fillStyle = '#FFFF00';
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.facingAngle * Math.PI) / 180);

        ctx.beginPath();
        // Convert mouthAngle degrees to radians
        const mouthRad = (this.mouthAngle * Math.PI) / 180;
        
        ctx.arc(0, 0, 6.5, mouthRad, Math.PI * 2 - mouthRad);
        ctx.lineTo(0, 0);
        ctx.fill();

        ctx.restore();
    }
}
