import { Ghost } from './Ghost.js';

export class Blinky extends Ghost {
    constructor(startTile) {
        // Name, startTile, scatterTarget (top-right corner 25, 0), HTML color
        super('Blinky', startTile, { x: 25, y: -4 }, '#FF0000');
        
        // Blinky starts outside the house directly
        this.state = 'SCATTER';
        
        // Starts moving left initially
        this.dir = { x: -1, y: 0 };
    }

    /**
     * Blinky relentlessly targets Pac-Man's current exact tile.
     */
    getTargetTile(pacman, ghosts) {
        // Note: Elroy logic will be handled manually in wave controller or here based on remaining dots
        return { x: pacman.tileX, y: pacman.tileY };
    }
}
