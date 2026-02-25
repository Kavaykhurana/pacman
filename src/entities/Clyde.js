import { Ghost } from './Ghost.js';

function euclideanDistance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

export class Clyde extends Ghost {
    constructor(startTile) {
        // Name, startTile, scatterTarget (bottom-left 0, 31), HTML color
        super('Clyde', startTile, { x: 0, y: 31 }, '#FFB852');
        
        this.state = 'IDLE';
        this.dir = { x: 0, y: -1 };
    }

    /**
     * Clyde's personality:
     * - If distance to Pac-Man > 8 tiles, chase exactly like Blinky.
     * - If distance to Pac-Man <= 8 tiles, retreat to scatter corner.
     */
    getTargetTile(pacman, ghosts) {
        const dist = euclideanDistance(this.tileX, this.tileY, pacman.tileX, pacman.tileY);

        if (dist > 8) {
            return { x: pacman.tileX, y: pacman.tileY };
        } else {
            return this.scatterTarget;
        }
    }
}
