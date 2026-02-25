export const TILES = {
    EMPTY:              0,   // Walkable, no dot
    DOT:                1,   // Small pellet
    POWER_PELLET:       2,   // Large flashing pellet
    WALL:               3,   // Generic wall (bitmask will decide appearance)
    GHOST_HOUSE_DOOR:   13,  // Passable only by ghosts leaving/returning
    GHOST_HOUSE_FLOOR:  14,  // Ghost spawn zone
    TUNNEL:             15,  // Warp tunnel (left <-> right)
    
    // Ghost restriction zones
    NO_TURN_UP:         22,  // Specific authentic tiles where ghosts cannot turn upward
};

export const ASCII_TO_TILE = {
    '#': TILES.WALL,
    '.': TILES.DOT,
    'o': TILES.POWER_PELLET,
    'X': TILES.EMPTY,
    '-': TILES.GHOST_HOUSE_DOOR,
    '_': TILES.GHOST_HOUSE_FLOOR,
    'T': TILES.TUNNEL,
    ' ': TILES.EMPTY
};

export class TileMap {
    /**
     * @param {string} asciiMaze 
     */
    constructor(asciiMaze) {
        this.width = 0;
        this.height = 0;
        this.grid = []; // 1D array for flat memory/cache performance

        this.parseOptions(asciiMaze);
        this.applyNoTurnUpZones();
    }

    parseOptions(ascii) {
        const rows = ascii.trim().split('\n');
        this.height = rows.length;
        this.width = rows[0].length;
        this.grid = new Uint8Array(this.width * this.height);

        for (let y = 0; y < this.height; y++) {
            const rowStr = rows[y];
            for (let x = 0; x < this.width; x++) {
                const char = rowStr[x] || ' ';
                const tileType = ASCII_TO_TILE[char] ?? TILES.EMPTY;
                this.grid[y * this.width + x] = tileType;
            }
        }
    }

    /**
     * Classic Pac-Man has specific tiles where ghosts are forced to continue
     * horizontally or turn down, but CANNOT turn up.
     * Roughly: Above ghost house, and bottom left/right corners.
     */
    applyNoTurnUpZones() {
        this.noTurnUpTiles = new Set();
        // T-intersections just above the ghost house
        this._setNoTurnUpRegion(12, 11, 15, 11);
        this._setNoTurnUpRegion(12, 23, 15, 23); // Lower central
    }

    _setNoTurnUpRegion(x1, y1, x2, y2) {
        for(let y = y1; y <= y2; y++) {
            for(let x = x1; x <= x2; x++) {
                this.noTurnUpTiles.add(`${x},${y}`);
            }
        }
    }

    isNoTurnUpTile(x, y) {
        return this.noTurnUpTiles.has(`${x},${y}`);
    }

    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return TILES.TUNNEL; // Out of bounds usually means tunnel
        }
        return this.grid[y * this.width + x];
    }

    setTile(x, y, type) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.grid[y * this.width + x] = type;
        }
    }

    isSolidForPacman(x, y) {
        const t = this.getTile(x, y);
        return t === TILES.WALL || t === TILES.GHOST_HOUSE_DOOR;
    }

    isSolidForGhost(x, y, state) {
        const t = this.getTile(x, y);
        if (t === TILES.WALL) return true;
        // If outside trying to get in, door is solid unless state is EATEN
        if (t === TILES.GHOST_HOUSE_DOOR && state !== 'EATEN' && state !== 'LEAVING_HOUSE') {
            return true;
        }
        return false;
    }
}
