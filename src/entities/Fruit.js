import { EventBus } from '../core/EventBus.js';

export class Fruit {
    constructor() {
        // Tile 13, 17 is below the ghost house
        this.tileX = 13.5; // Offset to center between tiles visually
        this.tileY = 17;
        this.tileSize = 8;
        
        this.x = this.tileX * this.tileSize;
        this.y = this.tileY * this.tileSize;

        this.isActive = false;
        this.timer = 0;
        this.maxTime = 9.5; // Seconds before disappearing

        this.currentFruits = {
            1: { symbol: '🍒', score: 100 },
            2: { symbol: '🍓', score: 300 },
            3: { symbol: '🍊', score: 500 },
            // Simplified table for Phase 1
            default: { symbol: '🍎', score: 700 }
        };
        this.currentData = null;
    }

    /**
     * Triggered by specific dot count thresholds (e.g., 70 and 170 eaten)
     */
    spawn(level) {
        this.isActive = true;
        this.timer = this.maxTime;
        this.currentData = this.currentFruits[level] || this.currentFruits.default;
    }

    update(dt, pacman) {
        if (!this.isActive) return;

        this.timer -= dt;
        if (this.timer <= 0) {
            this.isActive = false;
            return;
        }

        // Collision Check (AABB center based)
        const dist = Math.hypot(pacman.x - this.x, pacman.y - this.y);
        if (dist <= 8) {
            this.isActive = false;
            EventBus.emit('FRUIT_EATEN', {
                x: this.x,
                y: this.y,
                score: this.currentData.score
            });
        }
    }

    render(ctx) {
        if (!this.isActive || !this.currentData) return;

        ctx.save();
        ctx.font = '10px sans-serif'; // Emoji fallback since classic font lacking generic emoji
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.currentData.symbol, this.x, this.y);
        ctx.restore();
    }
}
