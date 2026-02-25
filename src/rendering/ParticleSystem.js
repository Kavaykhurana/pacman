export class ParticleSystem {
    constructor() {
        this.particles = []; // Object pool pattern is better, but array is fine for Phase 1
        this.maxParticles = 16; 
    }

    /**
     * @param {number} x 
     * @param {number} y 
     * @param {string|number} text 
     * @param {string} color 
     */
    addPop(x, y, text, color = '#00FFFF') {
        if (this.particles.length >= this.maxParticles) {
            this.particles.shift(); // Remove oldest to stay within budget
        }

        this.particles.push({
            x: x,
            y: y,
            text: text,
            color: color,
            life: 1.0,  // 1 second duration
            maxLife: 1.0,
            vy: -15     // Float upward at 15px/second
        });
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            p.y += p.vy * dt;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    render(ctx) {
        // Particles render using global composite or just alpha
        ctx.save();
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.textAlign = 'center';

        for (const p of this.particles) {
            // Fade out in last 50% of life
            const alpha = p.life < 0.5 ? p.life * 2 : 1.0;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.fillText(p.text, p.x, p.y);
        }
        ctx.restore();
    }
}
