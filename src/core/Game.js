import { TileMap } from '../world/TileMap.js';
import { MAZE_CLASSIC_ASCII } from '../world/mazes/classic.js';
import { MazeRenderer } from '../world/MazeRenderer.js';
import { DotManager } from '../world/DotManager.js';
import { WaveController } from '../world/WaveController.js';
import { EventBus } from '../core/EventBus.js';
import { ScoreManager } from '../core/ScoreManager.js';
import { AudioSystem } from '../core/AudioSystem.js';

import { PacMan } from '../entities/PacMan.js';
import { Blinky } from '../entities/Blinky.js';
import { Pinky } from '../entities/Pinky.js';
import { Inky } from '../entities/Inky.js';
import { Clyde } from '../entities/Clyde.js';
import { Fruit } from '../entities/Fruit.js';

import { ParticleSystem } from '../rendering/ParticleSystem.js';

export class Game {
    /**
     * @param {HTMLCanvasElement} canvas 
     * @param {import('./InputHandler.js').InputHandler} input 
     */
    constructor(canvas, input) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.input = input;
        
        this.fixedDeltaTime = 1 / 60; // 16.67ms
        this.accumulator = 0;
        this.lastTime = 0;
        this.isRunning = false;

        this.STATES = { BOOT: 0, TITLE_SCREEN: 1, MODE_SELECT: 2, LEVEL_INTRO: 3, PLAYING: 4, PAUSED: 5, PLAYER_DEATH: 6, GAME_OVER: 7, VICTORY: 8 };
        this.currentState = this.STATES.BOOT;

        // Player Progress
        this.lives = 3;
        this.level = 1;
        this.deathTimer = 0;

        // Managers
        this.audioSystem = new AudioSystem();
        this.scoreManager = new ScoreManager();
        this.tileMap = new TileMap(MAZE_CLASSIC_ASCII);
        this.mazeRenderer = new MazeRenderer(this.tileMap);
        this.dotManager = new DotManager(this.tileMap);
        this.waveController = new WaveController();
        this.particleSystem = new ParticleSystem();

        this._initLevel();
        this._setupEvents();
    }

    _initLevel() {
        this.pacman = new PacMan(14, 23);
        this.fruit = new Fruit();
        
        this.ghosts = [
            new Blinky({ x: 13, y: 11 }),
            new Pinky({ x: 13, y: 14 }),
            new Inky({ x: 11, y: 14 }),
            new Clyde({ x: 15, y: 14 })
        ];
    }

    _setupEvents() {
        EventBus.on('POWER_PELLET_EATEN', () => {
            this.waveController.setPaused(true);
            setTimeout(() => {
                this.waveController.setPaused(false);
                const globalState = this.waveController.getCurrentState();
                for (const ghost of this.ghosts) {
                    if (ghost.state === 'FRIGHTENED') {
                        ghost.state = globalState;
                    }
                }
            }, 6000);

            for (const ghost of this.ghosts) {
                if (ghost.state !== 'EATEN' && ghost.state !== 'IDLE') {
                    ghost.state = 'FRIGHTENED';
                    ghost.dir = { x: -ghost.dir.x, y: -ghost.dir.y };
                }
            }
        });

        EventBus.on('SPAWN_SCORE_POPUP', (data) => {
            this.particleSystem.addPop(data.x, data.y, data.score);
        });

        EventBus.on('DOT_EATEN', () => {
            EventBus.emit('PLAY_SOUND', 'WAKA');
            if (this.dotManager.dotsEaten === 70 || this.dotManager.dotsEaten === 170) {
                this.fruit.spawn(this.level);
            }
            if (this.dotManager.totalDots - this.dotManager.dotsEaten === 0) {
                // Game Won
                this.changeState(this.STATES.VICTORY);
            }
        });

        EventBus.on('FRUIT_EATEN', () => {
            EventBus.emit('PLAY_SOUND', 'EAT_FRUIT');
        });

        EventBus.on('EXTRA_LIFE', () => {
            this.lives++;
            EventBus.emit('PLAY_SOUND', 'EXTRA_LIFE');
        });
    }

    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        console.log("Game Engine Started.");
        
        this.changeState(this.STATES.LEVEL_INTRO);
        requestAnimationFrame((time) => this.loop(time));
    }

    changeState(newState) {
        this.currentState = newState;
        if (newState === this.STATES.LEVEL_INTRO) {
            this.deathTimer = 0; // Using deathTimer generically as a state timer
            EventBus.emit('PLAY_SOUND', 'START_GAME');
            this.input.consumeAction();
            this.input.consumePause();
        } else if (newState === this.STATES.PLAYER_DEATH) {
            this.deathTimer = 0;
            EventBus.emit('PLAY_SOUND', 'DEATH');
        } else if (newState === this.STATES.GAME_OVER || newState === this.STATES.VICTORY) {
            // Flush queued inputs so we require a fresh tap/spacebar
            this.input.consumeAction();
            this.input.consumePause();
        }
    }

    loop(time) {
        if (!this.isRunning) return;

        let frameTime = (time - this.lastTime) / 1000;
        this.lastTime = time;

        if (frameTime > 0.25) frameTime = 0.25;

        this.accumulator += frameTime;

        while (this.accumulator >= this.fixedDeltaTime) {
            this.update(this.fixedDeltaTime);
            this.accumulator -= this.fixedDeltaTime;
        }

        const alpha = this.accumulator / this.fixedDeltaTime;
        this.render(alpha, time);

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // Only consume pause toggles during active gameplay or when paused
        if (this.currentState === this.STATES.PLAYING || this.currentState === this.STATES.PAUSED) {
            if (this.input.consumePause()) {
                if (this.currentState === this.STATES.PLAYING) this.changeState(this.STATES.PAUSED);
                else this.changeState(this.STATES.PLAYING);
            }
        }

        switch (this.currentState) {
            case this.STATES.LEVEL_INTRO:
                this.deathTimer += dt;
                if (this.deathTimer > 4.5) { // Jingle takes a bit
                    this.changeState(this.STATES.PLAYING);
                }
                break;
            case this.STATES.PLAYING:
                this.dotManager.update(dt);
                this.particleSystem.update(dt);
                this.fruit.update(dt, this.pacman);
                
                const changed = this.waveController.update(dt);
                if (changed) {
                    const globalState = this.waveController.getCurrentState();
                    for (const ghost of this.ghosts) {
                        if (ghost.state === 'SCATTER' || ghost.state === 'CHASE') {
                            ghost.state = globalState;
                            ghost.dir = { x: -ghost.dir.x, y: -ghost.dir.y };
                        }
                    }
                }

                this.pacman.update(dt, this.input, this.tileMap, this.dotManager);
                
                // Ghost House Release Logic
                if (this.ghosts[1].state === 'IDLE') this.ghosts[1].state = 'LEAVING_HOUSE';
                if (this.ghosts[2].state === 'IDLE' && this.dotManager.dotsEaten >= 30) this.ghosts[2].state = 'LEAVING_HOUSE';
                if (this.ghosts[3].state === 'IDLE' && this.dotManager.dotsEaten >= 60) this.ghosts[3].state = 'LEAVING_HOUSE';

                for (const ghost of this.ghosts) {
                    // Instantly sync state once ghost arrives outside the door
                    if (ghost.state === 'JUST_LEFT_HOUSE') {
                        ghost.state = this.waveController.getCurrentState();
                    }

                    ghost.update(dt, this.tileMap, this.pacman, this.ghosts);

                    // Box collision roughly 8px overlap
                    const dx = this.pacman.x - ghost.x;
                    const dy = this.pacman.y - ghost.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist < 6) {
                        if (ghost.state === 'FRIGHTENED') {
                            ghost.state = 'EATEN';
                            EventBus.emit('GHOST_EATEN', ghost);
                        } else if (ghost.state === 'CHASE' || ghost.state === 'SCATTER') {
                            this.changeState(this.STATES.PLAYER_DEATH);
                        }
                    }
                }
                break;
            case this.STATES.PAUSED:
                break;
            case this.STATES.PLAYER_DEATH:
                this.deathTimer += dt;
                
                // Spin animation logic over 2 seconds
                if (this.deathTimer < 2.0) {
                    this.pacman.facingAngle += 400 * dt;
                } else if (this.deathTimer > 3.0) {
                    // Respawn or game over
                    this.lives--;
                    if (this.lives >= 0) {
                        this._initLevel();
                        this.changeState(this.STATES.PLAYING);
                    } else {
                        this.changeState(this.STATES.GAME_OVER);
                    }
                }
                break;
            case this.STATES.GAME_OVER:
            case this.STATES.VICTORY:
                // Wait for tap or Space to restart
                if (this.input.consumeAction() || this.input.consumePause()) {
                    this.lives = 3;
                    this.level = 1;
                    this.scoreManager.score = 0;
                    this.dotManager.reset(this.tileMap);
                    this.waveController = new WaveController();
                    this._initLevel();
                    this.changeState(this.STATES.LEVEL_INTRO);
                }
                break;
        }
    }

    render(alpha, time) {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.currentState >= this.STATES.LEVEL_INTRO && this.currentState <= this.STATES.VICTORY) {
            this.mazeRenderer.render(this.ctx);
            this.dotManager.render(this.ctx);
            this.fruit.render(this.ctx);

            const frameTime = time / 1000;
            
            // Only draw ghosts if playing or paused (hide during death)
            if (this.currentState === this.STATES.PLAYING || this.currentState === this.STATES.PAUSED || this.currentState === this.STATES.LEVEL_INTRO) {
                for (const ghost of this.ghosts) {
                    ghost.render(this.ctx, frameTime);
                }
            }
            
            // Draw pacman shrinking/spinning during death
            if (this.currentState !== this.STATES.GAME_OVER && this.currentState !== this.STATES.VICTORY) {
                if (this.currentState === this.STATES.PLAYER_DEATH && this.deathTimer < 2.0) {
                     const sizeMult = Math.max(0, 1.0 - (this.deathTimer / 2.0));
                     this.ctx.save();
                     this.ctx.translate(this.pacman.x, this.pacman.y);
                     this.ctx.scale(sizeMult, sizeMult);
                     this.ctx.translate(-this.pacman.x, -this.pacman.y);
                     this.pacman.render(this.ctx);
                     this.ctx.restore();
                } else if (this.currentState !== this.STATES.PLAYER_DEATH) {
                    this.pacman.render(this.ctx);
                }
            }

            this.particleSystem.render(this.ctx);

            // Draw HUD
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '8px "Press Start 2P", monospace';
            
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`1UP`, 16, 16);
            this.ctx.fillText(`${this.scoreManager.score}`, 16, 26);
            
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`HIGH SCORE`, 112, 16);
            this.ctx.fillText(`${this.scoreManager.highScore}`, 112, 26);
            
            if (this.currentState === this.STATES.PLAYING) {
                // Debug Wave Timer only in Play
                this.ctx.textAlign = 'right';
                this.ctx.fillStyle = '#888';
                this.ctx.fillText(`Wave: ${this.waveController.getCurrentState()}`, 208, 8);
            } else if (this.currentState === this.STATES.LEVEL_INTRO) {
                this.ctx.fillStyle = 'yellow';
                this.ctx.textAlign = 'center';
                // 4.5 second intro jingle - let's split into 3, 2, 1, READY!
                let text = "READY!";
                if (this.deathTimer < 1.0) text = "3";
                else if (this.deathTimer < 2.0) text = "2";
                else if (this.deathTimer < 3.0) text = "1";
                
                this.ctx.fillText(text, 112, 160);
            }

            // Lives representation
            this.ctx.textAlign = 'left';
            this.ctx.fillStyle = '#FFFF00';
            // Render pac-man profile icons for lives
            let livesStr = "";
            for (let i = 0; i < this.lives; i++) {
                livesStr += "c "; // Assuming 'c' loosely resembles pacman in this font, or we can draw arc manually
            }
            this.ctx.fillText(livesStr, 16, 280);
            
            if (this.currentState === this.STATES.PAUSED) {
                this.ctx.fillStyle = 'yellow';
                this.ctx.textAlign = 'center';
                this.ctx.fillText("PAUSED", 112, 140);
            } else if (this.currentState === this.STATES.GAME_OVER) {
                this.ctx.fillStyle = 'red';
                this.ctx.textAlign = 'center';
                this.ctx.fillText("GAME OVER", 112, 140);
                this.ctx.fillStyle = 'white';
                this.ctx.font = '6px "Press Start 2P", monospace';
                this.ctx.fillText("TAP OR PRESS SPACE TO START", 112, 160);
            } else if (this.currentState === this.STATES.VICTORY) {
                this.ctx.fillStyle = '#00FF00';
                this.ctx.textAlign = 'center';
                this.ctx.fillText("YOU WIN!", 112, 140);
                this.ctx.fillStyle = 'white';
                this.ctx.font = '6px "Press Start 2P", monospace';
                this.ctx.fillText("TAP OR PRESS SPACE TO RESTART", 112, 160);
            }
        }
    }
}
