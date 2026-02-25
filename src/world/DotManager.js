import { TILES } from './TileMap.js';

export class DotManager {
    /**
     * @param {import('./TileMap.js').TileMap} tileMap 
     */
    constructor(tileMap) {
        this.tileMap = tileMap;
        this.tileSize = 8;
        
        // Performance Contract: Flat typed array for dot state
        // 1 = active, 0 = eaten
        this.activeDots = new Uint8Array(tileMap.width * tileMap.height);
        
        this.totalDots = 0;
        this.dotsEaten = 0;

        // Flash timer for power pellets (2Hz = 250ms on / 250ms off)
        this.flashTimer = 0;
        this.pelletVisible = true;

        this._initializeDots();
    }

    _initializeDots() {
        for (let i = 0; i < this.activeDots.length; i++) {
            const type = this.tileMap.grid[i];
            if (type === TILES.DOT || type === TILES.POWER_PELLET) {
                this.activeDots[i] = 1;
                this.totalDots++;
            } else {
                this.activeDots[i] = 0;
            }
        }
    }

    reset(tileMap) {
        if (tileMap) this.tileMap = tileMap;
        this.totalDots = 0;
        this.dotsEaten = 0;
        this._initializeDots();
    }

    /**
     * @param {number} x Tile X 
     * @param {number} y Tile Y
     * @returns {number|null} TILES.DOT, TILES.POWER_PELLET, or null if empty/eaten
     */
    eatDot(x, y) {
        const index = y * this.tileMap.width + x;
        if (this.activeDots[index] === 1) {
            this.activeDots[index] = 0;
            this.dotsEaten++;
            return this.tileMap.grid[index];
        }
        return null; // Already eaten or not a dot
    }

    update(dt) {
        // Power Pellet pulsing animation hook
        this.flashTimer += dt;
        if (this.flashTimer >= 0.25) { // 250ms
            this.flashTimer = 0;
            this.pelletVisible = !this.pelletVisible;
        }
    }

    render(ctx) {
        ctx.fillStyle = '#FFB8AE'; // Classic dot color

        for (let y = 0; y < this.tileMap.height; y++) {
            for (let x = 0; x < this.tileMap.width; x++) {
                const index = y * this.tileMap.width + x;
                
                if (this.activeDots[index] === 1) {
                    const type = this.tileMap.grid[index];
                    const px = x * this.tileSize;
                    const py = y * this.tileSize;
                    
                    if (type === TILES.DOT) {
                        // 2x2 dot centered in 8x8 tile
                        ctx.fillRect(px + 3, py + 3, 2, 2);
                    } else if (type === TILES.POWER_PELLET && this.pelletVisible) {
                        // 8x8 pulsing circle
                        ctx.beginPath();
                        ctx.arc(px + 4, py + 4, 4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }
    }

    getDotsRemaining() {
        return this.totalDots - this.dotsEaten;
    }
}
