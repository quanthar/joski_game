import {
    WORLD_W, WORLD_H, TILE_SIZE, PLAYER_RADIUS,
    BULLET_RADIUS, ITEM_RADIUS
} from '@shared/constants.js';
import { WALLS, DECORATIONS } from '@shared/map.js';

/**
 * Renderer — отрисовка мира в мультяшном стиле (toon-style).
 */
export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    beginFrame(camera) {
        const { ctx, canvas } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Background (Deep space/Sci-fi floor)
        const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        bgGrad.addColorStop(0, '#0f0c29');
        bgGrad.addColorStop(0.5, '#302b63');
        bgGrad.addColorStop(1, '#24243e');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(camera.offsetX, camera.offsetY);
    }

    endFrame() {
        this.ctx.restore();
    }

    drawMap() {
        const { ctx } = this;

        // Floor Tiles
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, WORLD_W, WORLD_H);

        // Grid
        ctx.strokeStyle = 'rgba(77, 171, 247, 0.05)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= WORLD_W; x += TILE_SIZE * 2) {
            ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H);
        }
        for (let y = 0; y <= WORLD_H; y += TILE_SIZE * 2) {
            ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y);
        }
        ctx.stroke();

        // Decorations
        if (DECORATIONS) {
            for (const dec of DECORATIONS) {
                this._drawDecoration(dec);
            }
        }

        // Walls and Covers
        for (const wall of WALLS) {
            this._drawWall(wall);
        }

        // World Border Glow
        ctx.strokeStyle = '#4dabf7';
        ctx.setLineDash([20, 10]);
        ctx.lineWidth = 6;
        ctx.strokeRect(0, 0, WORLD_W, WORLD_H);
        ctx.setLineDash([]);
    }

    _drawWall(wall) {
        const { ctx } = this;
        const { x, y, w, h, type } = wall;

        ctx.save();

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(x + 6, y + 6, w, h);

        // Style based on type
        switch (type) {
            case 'crate':
                ctx.fillStyle = '#e67e22'; // Orange crate
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = '#d35400';
                ctx.lineWidth = 4;
                ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
                // "X" cross
                ctx.beginPath();
                ctx.moveTo(x + 10, y + 10); ctx.lineTo(x + w - 10, y + h - 10);
                ctx.moveTo(x + w - 10, y + 10); ctx.lineTo(x + 10, y + h - 10);
                ctx.stroke();
                break;
            case 'barrel':
                ctx.fillStyle = '#34495e';
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(x, y, w, h, 10);
                } else {
                    ctx.rect(x, y, w, h);
                }
                ctx.fill();
                ctx.strokeStyle = '#2c3e50';
                ctx.stroke();
                // Ridges
                ctx.beginPath();
                ctx.moveTo(x, y + h * 0.3); ctx.lineTo(x + w, y + h * 0.3);
                ctx.moveTo(x, y + h * 0.7); ctx.lineTo(x + w, y + h * 0.7);
                ctx.stroke();
                break;
            case 'container':
                ctx.fillStyle = '#2980b9';
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = '#1f6391';
                ctx.lineWidth = 3;
                // Stripes
                for (let i = 10; i < w; i += 20) {
                    ctx.beginPath();
                    ctx.moveTo(x + i, y); ctx.lineTo(x + i, y + h);
                    ctx.stroke();
                }
                ctx.strokeRect(x, y, w, h);
                break;
            default: // Building or generic wall
                ctx.fillStyle = '#2c3e50';
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = '#bdc3c7';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, w, h);
                // Tech lines
                ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                ctx.beginPath();
                ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
                ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
                ctx.stroke();
        }
        ctx.restore();
    }

    _drawDecoration(dec) {
        const { ctx } = this;
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#4dabf7';
        if (dec.type === 'vent') {
            ctx.fillRect(dec.x, dec.y, dec.size, dec.size);
            ctx.strokeStyle = '#4dabf7';
            ctx.lineWidth = 1;
            for (let i = 0; i < dec.size; i += 8) {
                ctx.beginPath(); ctx.moveTo(dec.x, dec.y + i); ctx.lineTo(dec.x + dec.size, dec.y + i); ctx.stroke();
            }
        } else if (dec.type === 'logo') {
            ctx.font = `bold ${dec.size}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('ARENA', dec.x, dec.y);
        }
        ctx.restore();
    }

    drawPlayer(x, y, rotation, color = '#00ff88', isLocal = false, heroType = 'scout') {
        const { ctx } = this;
        const r = PLAYER_RADIUS;

        ctx.save();
        ctx.translate(x, y);

        // Body Shadow
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowOffsetY = 4;

        // Hero Specific Visuals
        ctx.rotate(rotation);

        // Outer Glow for local
        if (isLocal) {
            ctx.beginPath();
            ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Draw character body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // White "Eyes" or "Facer" to show direction
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(r * 0.4, -r * 0.3, r * 0.25, 0, Math.PI * 2);
        ctx.arc(r * 0.4, r * 0.3, r * 0.25, 0, Math.PI * 2);
        ctx.fill();

        // Gun
        ctx.fillStyle = '#333';
        ctx.strokeStyle = '#eee';
        ctx.lineWidth = 2;
        let gunW = r * 1.2;
        let gunH = r * 0.4;

        if (heroType === 'heavy') { gunW *= 1.3; gunH *= 1.5; }
        if (heroType === 'shadow') { gunW *= 0.8; gunH *= 0.6; }

        ctx.fillRect(r * 0.6, -gunH / 2, gunW, gunH);
        ctx.strokeRect(r * 0.6, -gunH / 2, gunW, gunH);

        // Details based on heroType
        if (heroType === 'scout') {
            // Blue goggles or stripes
            ctx.fillStyle = '#4dabf7';
            ctx.fillRect(-r * 0.8, -r * 0.2, r * 0.4, r * 0.4);
        } else if (heroType === 'heavy') {
            // Armor plates
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawCrosshair(worldX, worldY) {
        const { ctx } = this;
        const size = 14;

        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(worldX, worldY, 4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(worldX - size, worldY); ctx.lineTo(worldX - 6, worldY);
        ctx.moveTo(worldX + size, worldY); ctx.lineTo(worldX + 6, worldY);
        ctx.moveTo(worldX, worldY - size); ctx.lineTo(worldX, worldY - 6);
        ctx.moveTo(worldX, worldY + size); ctx.lineTo(worldX, worldY + 6);
        ctx.stroke();
    }

    drawBullet(x, y, isOwn, type = 'pistol') {
        const { ctx } = this;
        ctx.save();

        if (type === 'rocket') {
            ctx.fillStyle = '#ff4d4d'; // Red rocket
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff9f43';
            ctx.beginPath();
            ctx.arc(x, y, BULLET_RADIUS + 4, 0, Math.PI * 2);
            ctx.fill();
            // Core
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x, y, BULLET_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = isOwn ? '#00ff88' : '#fff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath();
            ctx.arc(x, y, BULLET_RADIUS + 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    drawItem(item) {
        const { ctx } = this;
        ctx.save();
        ctx.translate(item.x, item.y);

        // Пульсация
        const pulse = 1 + Math.sin(performance.now() / 200) * 0.15;
        ctx.scale(pulse, pulse);

        let color = '#fff';
        let text = '?';
        switch (item.type) {
            case 'medkit': color = '#ff4d4d'; text = '+'; break;
            case 'speed': color = '#feca57'; text = '>>'; break;
            case 'rifle': color = '#ff9f43'; text = 'AR'; break;
            case 'shotgun': color = '#5f27cd'; text = 'SG'; break;
            case 'rocket': color = '#ee5253'; text = 'RK'; break;
            default: color = '#fff'; break;
        }

        ctx.fillStyle = color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(0, 0, ITEM_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0);

        ctx.restore();
    }

    drawPlayerName(x, y, name) {
        const { ctx } = this;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px "Outfit", "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#000';
        ctx.fillText(name, x, y - PLAYER_RADIUS - 22);
        ctx.shadowBlur = 0;
    }

    drawHealthBar(x, y, hp, maxHp) {
        const { ctx } = this;
        const barW = 40;
        const barH = 6;
        const barX = x - barW / 2;
        const barY = y - PLAYER_RADIUS - 14;
        const ratio = Math.max(0, hp / maxHp);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(barX, barY, barW, barH, 3);
        } else {
            ctx.rect(barX, barY, barW, barH);
        }
        ctx.fill();

        if (ratio > 0) {
            const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
            grad.addColorStop(0, '#ff4b2b');
            grad.addColorStop(1, '#ff416c');
            if (ratio > 0.4) {
                grad.addColorStop(0, '#00ff88');
                grad.addColorStop(1, '#00bd68');
            }
            ctx.fillStyle = grad;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(barX, barY, barW * ratio, barH, 3);
            } else {
                ctx.rect(barX, barY, barW * ratio, barH);
            }
            ctx.fill();
        }
    }

    drawAmmoBar(ammo, maxAmmo, isReloading) {
        const { ctx, canvas } = this;
        const barW = 180;
        const barH = 10;
        const barX = (canvas.width - barW) / 2;
        const barY = canvas.height - 60;

        ctx.fillStyle = 'rgba(15, 15, 26, 0.85)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(barX - 10, barY - 35, barW + 20, 55, 8);
        } else {
            ctx.rect(barX - 10, barY - 35, barW + 20, 55);
        }
        ctx.fill();

        if (isReloading) {
            ctx.fillStyle = '#ff9f43';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('RELOADING...', canvas.width / 2, barY - 10);
        } else {
            ctx.fillStyle = ammo < 5 ? '#ff4757' : '#fff';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`AMMO: ${ammo} / ${maxAmmo}`, canvas.width / 2, barY - 10);
        }

        const ratio = ammo / maxAmmo;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(barX, barY, barW * ratio, barH);
    }

    drawDebugHUD(data) {
        const { ctx } = this;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(10, 10, 160, 60);
        ctx.fillStyle = '#00ff88';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`FPS: ${data.fps}`, 20, 25);
        ctx.fillText(`PLAYERS: ${data.playerCount}`, 20, 40);
        ctx.fillText(`PING: LOCAL`, 20, 55);
    }

    drawKillFeed(feed) {
        const { ctx, canvas } = this;
        let y = 30;
        ctx.textAlign = 'right';
        ctx.font = 'bold 13px sans-serif';

        for (const item of feed) {
            const text = `${item.killerName} 🔫 ${item.victimName}`;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            const metrics = ctx.measureText(text);
            ctx.fillRect(canvas.width - metrics.width - 30, y - 15, metrics.width + 20, 20);

            ctx.fillStyle = '#fff';
            ctx.fillText(text, canvas.width - 20, y);
            y += 25;
        }
    }

    drawDeathScreen(killerName, timer) {
        const { ctx, canvas } = this;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 48px sans-serif';
        ctx.fillText('ELIMINATED', canvas.width / 2, canvas.height / 2 - 20);

        ctx.font = '24px sans-serif';
        ctx.fillText(`By ${killerName}`, canvas.width / 2, canvas.height / 2 + 30);
        ctx.fillText(`Respawning in ${(timer / 1000).toFixed(1)}s`, canvas.width / 2, canvas.height / 2 + 70);
    }

    drawScoreboard(scores, myId) {
        const { ctx, canvas } = this;
        const w = 400;
        const entries = Object.entries(scores).sort((a, b) => b[1].frags - a[1].frags);
        const h = 60 + entries.length * 30;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;

        ctx.fillStyle = 'rgba(15, 15, 26, 0.95)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, 12);
        } else {
            ctx.rect(x, y, w, h);
        }
        ctx.fill();
        ctx.strokeStyle = '#4dabf7';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#4dabf7';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('LEADERBOARD', canvas.width / 2, y + 35);

        ctx.font = '14px monospace';
        let rowY = y + 70;
        for (const [id, data] of entries) {
            if (id === myId) {
                ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
                ctx.fillRect(x + 5, rowY - 18, w - 10, 25);
            }
            ctx.fillStyle = id === myId ? '#00ff88' : '#fff';
            ctx.textAlign = 'left';
            ctx.fillText(data.name, x + 20, rowY);
            ctx.textAlign = 'right';
            ctx.fillText(`K: ${data.frags}  D: ${data.deaths}`, x + w - 20, rowY);
            rowY += 30;
        }
    }
}
