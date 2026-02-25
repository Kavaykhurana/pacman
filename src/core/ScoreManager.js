import { EventBus } from './EventBus.js';

export class ScoreManager {
    constructor() {
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('pacman_highscore')) || 0;
        
        // Ghost combo tracking
        this.ghostCombo = 0;

        // Constants
        this.SCORES = {
            dot: 10,
            powerPellet: 50,
            ghosts: [200, 400, 800, 1600],
            extraLifeThreshold: 10000
        };

        this.extraLifeAwarded = false;

        this._setupEvents();
    }

    _setupEvents() {
        EventBus.on('DOT_EATEN', () => this.addScore(this.SCORES.dot));
        
        EventBus.on('POWER_PELLET_EATEN', () => {
            this.addScore(this.SCORES.powerPellet);
            this.ghostCombo = 0; // Reset combo
        });

        EventBus.on('GHOST_EATEN', (ghost) => {
            const points = this.SCORES.ghosts[Math.min(this.ghostCombo, 3)];
            this.addScore(points);
            this.ghostCombo++;
            
            // Emit popup so ParticleSystem can render the string
            EventBus.emit('SPAWN_SCORE_POPUP', { x: ghost.x, y: ghost.y, score: points });
        });

        EventBus.on('FRUIT_EATEN', (data) => {
            this.addScore(data.score);
            EventBus.emit('SPAWN_SCORE_POPUP', { x: data.x, y: data.y, score: data.score });
        });
    }

    addScore(points) {
        this.score += points;

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('pacman_highscore', this.highScore);
        }

        if (this.score >= this.SCORES.extraLifeThreshold && !this.extraLifeAwarded) {
            this.extraLifeAwarded = true;
            EventBus.emit('EXTRA_LIFE');
        }
    }
}
