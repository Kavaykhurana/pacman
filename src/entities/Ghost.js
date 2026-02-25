import { TILES } from '../world/TileMap.js';

/**
 * Common math utilities for ghost logic
 */
function euclideanDistance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

function isOpposite(dirA, dirB) {
    return dirA.x === -dirB.x && dirA.y === -dirB.y;
}

export class Ghost {
    constructor(name, startTile, scatterTarget, color) {
        this.name = name;
        this.tileSize = 8;
        this.baseSpeed = 75.5 * 0.85; // 15% slower than Pac-Man
        
        this.baseColor = color;
        this.color = color;

        this.tileX = startTile.x;
        this.tileY = startTile.y;
        
        const half = this.tileSize / 2;
        this.x = (this.tileX * this.tileSize) + half;
        this.y = (this.tileY * this.tileSize) + half;

        this.dir = { x: 0, y: 0 };
        this.nextDir = { x: 0, y: 0 };
        this.eyeDir = { x: 1, y: 0 };

        // Authentic State Machine
        // IDLE -> LEAVING_HOUSE -> SCATTER <-> CHASE (triggered externally)
        this.state = 'IDLE'; 
        
        this.scatterTarget = scatterTarget;
        this.targetTile = { x: 0, y: 0 };

        this.isFlashing = false;
        
        // Allowed movement directions mapped to authentic priority (Up, Left, Down, Right)
        this.checkDirs = [
            { x: 0, y: -1 }, // UP
            { x: -1, y: 0 }, // LEFT
            { x: 0, y: 1 },  // DOWN
            { x: 1, y: 0 }   // RIGHT
        ];
    }

    /**
     * Overridden by child classes (Blinky, Pinky, etc.)
     */
    getTargetTile(pacman, ghosts) {
        return { x: 0, y: 0 };
    }

    /**
     * Authentic ghost logic:
     * 1. Cannot reverse direction
     * 2. Cannot turn UP at specific tiles
     * 3. Calculates euclidean distance to target for all valid adjacent tiles
     * 4. Picks the tile with the shortest distance. Tie breaks on Up->Left->Down->Right.
     */
    _chooseDirection(tileMap) {
        const reverseDir = { x: -this.dir.x, y: -this.dir.y };
        let bestDist = Infinity;
        let bestDir = this.dir;
        let validDirs = [];

        // If currently stopped (initial state or just left house), no reverse protection
        const isStopped = this.dir.x === 0 && this.dir.y === 0;

        for (const testDir of this.checkDirs) {
            // Rule 1: Cannot reverse
            if (!isStopped && testDir.x === reverseDir.x && testDir.y === reverseDir.y) continue;

            const checkX = this.tileX + testDir.x;
            const checkY = this.tileY + testDir.y;

            // Rule 2: Cannot turn up on specific tiles
            if (testDir.y === -1 && tileMap.isNoTurnUpTile(this.tileX, this.tileY)) {
                if (this.state !== 'EATEN' && this.state !== 'FRIGHTENED') {
                    continue; // Skip trying to go up
                }
            }

            // Valid tile check
            if (!tileMap.isSolidForGhost(checkX, checkY, this.state)) {
                validDirs.push(testDir);
                const dist = euclideanDistance(checkX, checkY, this.targetTile.x, this.targetTile.y);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestDir = testDir;
                }
            }
        }

        if (this.state === 'FRIGHTENED' && validDirs.length > 0) {
            return validDirs[Math.floor(Math.random() * validDirs.length)];
        }

        if (bestDist === Infinity && validDirs.length === 0 && !isStopped) {
           return reverseDir; // Trapped, force reverse
        }

        return bestDir;
    }

    update(dt, tileMap, pacman, ghosts) {
        // Handle IDLE / LEAVING_HOUSE specifically later via GhostHouse controller
        if (this.state === 'IDLE') return;

        // Determine current target based on state
        if (this.state === 'SCATTER' || this.state === 'LEAVING_HOUSE') {
            this.targetTile = this.scatterTarget;
        } else if (this.state === 'CHASE') {
            this.targetTile = this.getTargetTile(pacman, ghosts);
        } else if (this.state === 'FRIGHTENED') {
            // Pseudo-random turns at intersections
            // In classic, PRNG is used. Simplification: random valid turn.
        } else if (this.state === 'EATEN') {
            this.targetTile = { x: 13, y: 11 }; // Ghost house entry point above door
        }

        // Apply tunnel speed penalty
        let speedMult = 1.0;
        if (this.state === 'EATEN') {
            speedMult = 2.0;
        } else if (this.state === 'FRIGHTENED') {
            speedMult = 0.5;
        } else if (tileMap.getTile(this.tileX, this.tileY) === TILES.TUNNEL) {
            speedMult = 0.5; // Tunnel penalty
        }

        const speed = this.baseSpeed * speedMult * dt;

        // Tile center logic (similar to PacMan)
        const half = this.tileSize / 2;
        const cx = (this.tileX * this.tileSize) + half;
        const cy = (this.tileY * this.tileSize) + half;

        const distToCenter = Math.hypot(this.x - cx, this.y - cy);

        // Snap window
        if (distToCenter <= 2.0) {
            const movingRightHit  = this.dir.x === 1  && this.x - cx >= 0 && (this.x - speed) - cx <= 0;
            const movingLeftHit   = this.dir.x === -1 && this.x - cx <= 0 && (this.x + speed) - cx >= 0;
            const movingDownHit   = this.dir.y === 1  && this.y - cy >= 0 && (this.y - speed) - cy <= 0;
            const movingUpHit     = this.dir.y === -1 && this.y - cy <= 0 && (this.y + speed) - cy >= 0;

            if (movingRightHit || movingLeftHit || movingDownHit || movingUpHit || distToCenter < 1.0) {
                // We reached the exact center of a tile
                this.x = cx;
                this.y = cy;

                // Automatic State Transitions upon reaching key coordinate checkpoints
                if (this.state === 'LEAVING_HOUSE' && this.tileX === 13 && this.tileY === 11) {
                    this.state = 'JUST_LEFT_HOUSE'; // Will be instantly swapped to globalState in Game.js
                } else if (this.state === 'EATEN' && this.tileX === 13 && this.tileY === 14) {
                    this.state = 'LEAVING_HOUSE'; // Restored inside house, leave again
                }

                // Pick next direction based on target logic
                const chosenDir = this._chooseDirection(tileMap);
                this.dir = chosenDir;
                if (this.dir.x !== 0 || this.dir.y !== 0) {
                    this.eyeDir = { x: this.dir.x, y: this.dir.y };
                }

                // Move slightly in new direction to prevent getting stuck
                this.x += this.dir.x * 0.1;
                this.y += this.dir.y * 0.1;
            }
        }

        // Move
        this.x += this.dir.x * speed;
        this.y += this.dir.y * speed;

        // Sync tile coordinates
        this.tileX = Math.floor(this.x / this.tileSize);
        this.tileY = Math.floor(this.y / this.tileSize);

        // Tunnel Wrap
        if (this.tileX < 0) {
            this.x = (tileMap.width * this.tileSize) - 1;
            this.tileX = tileMap.width - 1;
        } else if (this.tileX >= tileMap.width) {
            this.x = 0;
            this.tileX = 0;
        }
    }

    render(ctx, frameTime) {
        if (this.state === 'EATEN') {
            this._drawEyes(ctx);
            return;
        }

        let isFrightened = this.state === 'FRIGHTENED';
        
        if (isFrightened) {
            // Flash between Dark Blue and White based on time
            const blink = Math.sin(frameTime * 15) > 0;
            ctx.fillStyle = blink ? '#FFFFFF' : '#1919A6';
        } else {
            ctx.fillStyle = this.color;
        }
        
        ctx.save();
        ctx.translate(this.x, this.y);

        // Body Size
        const r = 6.5; 
        
        ctx.beginPath();
        // Dome
        ctx.arc(0, 0 - 1, r, Math.PI, 0);
        // Right edge
        ctx.lineTo(r, r);

        // Skirt wave (simple sawtooth/sine approx based on time accumulator)
        // We use a global fake time parameter for animation
        const wave = Math.sin(frameTime * 15) > 0 ? 1 : 0;
        
        if (wave === 0) {
            ctx.lineTo(r, r);
            ctx.lineTo(r/2, r-2);
            ctx.lineTo(0, r);
            ctx.lineTo(-r/2, r-2);
            ctx.lineTo(-r, r);
        } else {
            ctx.lineTo(r, r-2);
            ctx.lineTo(r/2, r);
            ctx.lineTo(0, r-2);
            ctx.lineTo(-r/2, r);
            ctx.lineTo(-r, r-2);
        }

        // Left edge
        ctx.lineTo(-r, 0 - 1);
        ctx.fill();

        if (isFrightened) {
            // Draw frightened face (peach/pink squiggly mouth and dots for eyes)
            ctx.fillStyle = '#FFB8AE'; // Same as dot color
            ctx.beginPath();
            ctx.arc(-2.5, -3, 1.5, 0, Math.PI*2);
            ctx.arc(2.5, -3, 1.5, 0, Math.PI*2);
            ctx.fill();
            
            // Frightened mouth
            ctx.strokeStyle = '#FFB8AE';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-4, 2);
            ctx.lineTo(-2, 0);
            ctx.lineTo(0, 2);
            ctx.lineTo(2, 0);
            ctx.lineTo(4, 2);
            ctx.stroke();
        }

        ctx.restore();

        if (!isFrightened) {
            this._drawEyes(ctx);
        }
    }

    _drawEyes(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Whites
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(-2.5, -3, 2.5, 0, Math.PI*2);
        ctx.arc(2.5, -3, 2.5, 0, Math.PI*2);
        ctx.fill();

        // Pupils follow movement
        const px = this.eyeDir.x * 1.5;
        const py = this.eyeDir.y * 1.5;

        ctx.fillStyle = '#0000FF'; // Blue pupils
        ctx.beginPath();
        ctx.arc(-2.5 + px, -3 + py, 1.2, 0, Math.PI*2);
        ctx.arc(2.5 + px, -3 + py, 1.2, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
    }
}
