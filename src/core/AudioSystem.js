import { EventBus } from './EventBus.js';

export class AudioSystem {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = {};
        this.enabled = false; // Muted by default to avoid browser auto-play restrictions

        this._setupEvents();
    }

    _setupEvents() {
        // Enable audio on first interaction to bypass autoplay restrictions
        const unlockEvents = ['keydown', 'touchstart', 'touchend', 'click', 'pointerup'];
        
        const unlock = () => {
            if (!this.enabled) {
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume().then(() => {
                        this.enabled = true;
                        console.log("Audio unlocked.");
                        unlockEvents.forEach(e => window.removeEventListener(e, unlock));
                    }).catch(err => console.error("Audio unlock failed: ", err));
                } else if (this.ctx.state === 'running') {
                    this.enabled = true;
                    unlockEvents.forEach(e => window.removeEventListener(e, unlock));
                }
            }
        };

        unlockEvents.forEach(e => window.addEventListener(e, unlock));

        EventBus.on('PLAY_SOUND', (name) => {
            if (this.enabled) {
                this._playSynthPlaceholder(name);
            }
        });
    }

    // Temporary synth sounds until real assets are dropped in
    _playSynthPlaceholder(name) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;
        
        switch(name) {
            case 'WAKA':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(150, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'EAT_FRUIT':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.linearRampToValueAtTime(800, now + 0.2);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            case 'DEATH':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(10, now + 1.5);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0, now + 1.5);
                osc.start(now);
                osc.stop(now + 1.5);
                break;
            case 'START_GAME':
                osc.type = 'square';
                
                const notes = [440, 554.37, 659.25, 880, 554.37, 880];
                const noteLength = 0.15;
                
                let t = now;
                for (let i = 0; i < notes.length; i++) {
                    osc.frequency.setValueAtTime(notes[i], t);
                    gain.gain.setValueAtTime(0.1, t);
                    gain.gain.setValueAtTime(0, t + noteLength * 0.8);
                    t += noteLength;
                }
                
                osc.start(now);
                osc.stop(t);
                break;
        }
    }
}
