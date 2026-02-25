import { Ghost } from './Ghost.js';

export class Pinky extends Ghost {
    constructor(startTile) {
        // Name, startTile, scatterTarget (top-left corner 2, -4), HTML color
        super('Pinky', startTile, { x: 2, y: -4 }, '#FFB8FF');
        
        // Starts in house targeting down initially then up
        this.state = 'IDLE';
        this.dir = { x: 0, y: -1 };
    }

    /**
     * Pinky targets 4 tiles ahead of Pac-Man's current direction.
     * Contains the authentic arcade overflow bug for upward movement.
     */
    getTargetTile(pacman, ghosts) {
        let targetX = pacman.tileX + (pacman.dir.x * 4);
        let targetY = pacman.tileY + (pacman.dir.y * 4);

        // Authentic bug replication: when Pac-Man is facing UP (-y),
        // the original code mistakenly also subtracted from X offset.
        if (pacman.dir.y === -1 && pacman.dir.x === 0) {
            targetX -= 4;
        }

        return { x: targetX, y: targetY };
    }
}
