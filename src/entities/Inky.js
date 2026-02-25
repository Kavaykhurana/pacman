import { Ghost } from './Ghost.js';

export class Inky extends Ghost {
    constructor(startTile) {
        // Name, startTile, scatterTarget (bottom-right 27, 31), HTML color
        super('Inky', startTile, { x: 27, y: 31 }, '#00FFFF');
        
        this.state = 'IDLE';
        this.dir = { x: 0, y: -1 };
    }

    /**
     * Inky is the most complex. Uses both Pac-Man and Blinky's positions.
     * 1. Pivot point = 2 tiles ahead of Pac-Man.
     * 2. Vector from Blinky to pivot block.
     * 3. Target is pivot block + vector (effectively doubling the vector length from Blinky).
     */
    getTargetTile(pacman, ghosts) {
        // Find Blinky reference
        const blinky = ghosts.find(g => g.name === 'Blinky');
        if (!blinky) return { x: pacman.tileX, y: pacman.tileY }; // Fallback

        // Step 1: Pivot (2 tiles ahead, replicating same UP bug as Pinky)
        let pivotX = pacman.tileX + (pacman.dir.x * 2);
        let pivotY = pacman.tileY + (pacman.dir.y * 2);

        if (pacman.dir.y === -1 && pacman.dir.x === 0) {
            pivotX -= 2;
        }

        // Step 2 & 3: Vector math
        const vectorX = pivotX - blinky.tileX;
        const vectorY = pivotY - blinky.tileY;

        return {
            x: pivotX + vectorX,
            y: pivotY + vectorY
        };
    }
}
