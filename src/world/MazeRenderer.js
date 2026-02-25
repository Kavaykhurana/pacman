import { TILES } from './TileMap.js';

export class MazeRenderer {
    /**
     * @param {TileMap} tileMap 
     * @param {string} wallColor Hex color
     */
    constructor(tileMap, wallColor = '#2121DE') {
        this.tileMap = tileMap;
        this.wallColor = wallColor;
        this.tileSize = 8; // Original pixel size per tile

        // Pre-render the entire static maze to an offscreen canvas
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.tileMap.width * this.tileSize;
        this.offscreenCanvas.height = this.tileMap.height * this.tileSize;
        this.offCtx = this.offscreenCanvas.getContext('2d', { alpha: false }); // optimization

        this.bakeMaze();
    }

    bakeMaze() {
        // Clear with background color
        this.offCtx.fillStyle = '#000000';
        this.offCtx.fillRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);

        this.offCtx.strokeStyle = this.wallColor;
        this.offCtx.lineWidth = 1.5;
        this.offCtx.lineJoin = 'round';
        this.offCtx.lineCap = 'round';

        // Render ghost house door
        this.offCtx.fillStyle = '#FFB8FF'; // Pinkish door

        for (let y = 0; y < this.tileMap.height; y++) {
            for (let x = 0; x < this.tileMap.width; x++) {
                const t = this.tileMap.getTile(x, y);

                if (t === TILES.WALL) {
                    this._drawBitmaskWall(x, y);
                } else if (t === TILES.GHOST_HOUSE_DOOR) {
                    this.offCtx.fillRect(
                        x * this.tileSize, 
                        y * this.tileSize + (this.tileSize / 2) - 1, 
                        this.tileSize, 
                        2
                    );
                }
            }
        }
    }

    _isWallLike(x, y) {
        const t = this.tileMap.getTile(x, y);
        return t === TILES.WALL; 
    }

    _drawBitmaskWall(tx, ty) {
        const N = this._isWallLike(tx, ty - 1) ? 1 : 0;
        const S = this._isWallLike(tx, ty + 1) ? 1 : 0;
        const E = this._isWallLike(tx + 1, ty) ? 1 : 0;
        const W = this._isWallLike(tx - 1, ty) ? 1 : 0;

        const px = tx * this.tileSize;
        const py = ty * this.tileSize;
        const half = this.tileSize / 2;
        const cx = px + half;
        const cy = py + half;

        this.offCtx.beginPath();

        // Very basic connective neon line drawing to represent the wall bitmask
        // N connecting to center
        if (N) {
            this.offCtx.moveTo(cx, py);
            this.offCtx.lineTo(cx, cy);
        }
        if (S) {
            this.offCtx.moveTo(cx, cy);
            this.offCtx.lineTo(cx, cy + half);
        }
        if (E) {
            this.offCtx.moveTo(cx, cy);
            this.offCtx.lineTo(cx + half, cy);
        }
        if (W) {
            this.offCtx.moveTo(px, cy);
            this.offCtx.lineTo(cx, cy);
        }

        // If it's an isolated block or end point, draw a small dot/cap
        if (N+S+E+W === 0) {
           this.offCtx.arc(cx, cy, 1, 0, Math.PI * 2);
        }

        this.offCtx.stroke();
        
        // Connect corners for inner turns for authentic 'double line' feel 
        // (Simplified for Phase 1, can be expanded to full 16-tile autotile spritesheet later)
    }

    /**
     * Blits the pre-rendered maze onto the main context.
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        ctx.drawImage(this.offscreenCanvas, 0, 0);
    }
}
