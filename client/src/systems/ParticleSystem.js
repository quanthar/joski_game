/**
 * ParticleSystem — простая система частиц для эффектов попаданий и смертей.
 */
export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    /**
     * Создать взрыв частиц.
     * @param {number} x
     * @param {number} y
     * @param {string} color
     * @param {number} count
     */
    emit(x, y, color = '#ffffff', count = 8) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 150;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0, // от 1.0 до 0
                decay: 1.5 + Math.random() * 2.5, // скорость исчезновения
                color,
                size: 2 + Math.random() * 3
            });
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.95; // трение
            p.vy *= 0.95;
            p.life -= p.decay * dt;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        ctx.save();
        for (const p of this.particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
