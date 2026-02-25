export class WaveController {
    constructor() {
        this.level = 1;
        this.timer = 0;
        this.waveIndex = 0;
        
        // Define standard classic wave times (in seconds)
        this.waves = [
            { state: 'SCATTER', duration: 7 },
            { state: 'CHASE', duration: 20 },
            { state: 'SCATTER', duration: 7 },
            { state: 'CHASE', duration: 20 },
            { state: 'SCATTER', duration: 5 },
            { state: 'CHASE', duration: 20 },
            { state: 'SCATTER', duration: 5 },
            { state: 'CHASE', duration: Infinity }
        ];

        this.currentState = this.waves[this.waveIndex].state;
        this.isPaused = false;
    }

    update(dt) {
        if (this.isPaused) return;

        this.timer += dt;
        const currentWave = this.waves[this.waveIndex];

        if (this.timer >= currentWave.duration) {
            this.timer -= currentWave.duration;
            this.waveIndex++;
            if (this.waveIndex < this.waves.length) {
                this.currentState = this.waves[this.waveIndex].state;
                return true; // Indicates state change
            }
        }
        return false;
    }

    getCurrentState() {
        return this.currentState;
    }

    /** Pause the wave timer (e.g. during Frightened mode) */
    setPaused(paused) {
        this.isPaused = paused;
    }
}
