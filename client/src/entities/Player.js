import {
    PLAYER_SPEED, PLAYER_SPRINT_SPEED, PLAYER_RADIUS, PLAYER_MAX_HP,
    WORLD_W, WORLD_H, DASH_DURATION_MS, DASH_SPEED_MULTIPLIER, DASH_COOLDOWN_MS
} from '@shared/constants.js';
import { clamp } from '@shared/math.js';
import { WALLS } from '@shared/map.js';
import { resolveCircleAABB } from '@shared/Physics.js';
import { Prediction } from '../net/Prediction.js';
import { HEROES } from '@shared/heroes.js';

/**
 * Player — локальный игрок с client-side prediction.
 */
export class Player {
    constructor(x, y, name) {
        this.x = x;
        this.y = y;
        this.rotation = 0;
        this.hp = PLAYER_MAX_HP;
        this.maxHp = PLAYER_MAX_HP;
        this.name = name;
        this.ammo = 0;
        this.maxAmmo = 0;
        this.reloading = false;

        this.heroType = 'scout';
        this.speedMult = 1.0;

        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.dashDx = 0;
        this.dashDy = 0;

        this.prediction = new Prediction();
    }

    /**
     * Применить ввод локально (prediction) и сохранить в буфер.
     * @param {number} seq — порядковый номер INPUT-а
     * @param {number} dx — нормализованное направление
     * @param {number} dy
     * @param {number} dt — delta time в секундах
     */
    applyInput(seq, dx, dy, dt, sprint = false, dash = false, rotation = 0) {
        if (this.dashCooldown > 0) this.dashCooldown -= dt * 1000;

        if (dash && this.dashCooldown <= 0 && this.dashTimer <= 0) {
            this.dashTimer = DASH_DURATION_MS;
            this.dashCooldown = DASH_COOLDOWN_MS;
            this.dashDx = dx !== 0 || dy !== 0 ? dx : Math.cos(rotation);
            this.dashDy = dx !== 0 || dy !== 0 ? dy : Math.sin(rotation);
        }

        let speed = (sprint ? PLAYER_SPRINT_SPEED : PLAYER_SPEED) * this.speedMult;
        let moveX = dx;
        let moveY = dy;

        if (this.dashTimer > 0) {
            this.dashTimer -= dt * 1000;
            speed = PLAYER_SPEED * DASH_SPEED_MULTIPLIER;
            moveX = this.dashDx;
            moveY = this.dashDy;
        }

        this.x += moveX * speed * dt;
        this.y += moveY * speed * dt;

        // Коллизии со стенами
        for (const wall of WALLS) {
            const res = resolveCircleAABB(this.x, this.y, PLAYER_RADIUS, wall);
            if (res.collided) {
                this.x = res.x;
                this.y = res.y;
            }
        }

        this.x = clamp(this.x, PLAYER_RADIUS, WORLD_W - PLAYER_RADIUS);
        this.y = clamp(this.y, PLAYER_RADIUS, WORLD_H - PLAYER_RADIUS);

        // Сохранить в буфер для reconciliation
        this.prediction.addInput(seq, dx, dy, dt, sprint, dash, rotation);
    }

    /**
     * Обработать серверный снапшот — reconciliation.
     */
    onServerUpdate(serverState) {
        this.hp = serverState.hp;
        this.maxHp = serverState.maxHp || this.maxHp;

        if (serverState.maxAmmo !== undefined) {
            this.maxAmmo = serverState.maxAmmo;
        }

        if (serverState.heroType && serverState.heroType !== this.heroType) {
            this.heroType = serverState.heroType;
            const heroStats = HEROES.find(h => h.type === this.heroType);
            if (heroStats) this.speedMult = heroStats.speed;
        }

        if (serverState.lastProcessedSeq !== undefined) {
            // Reconciliation
            const corrected = this.prediction.reconcile(
                serverState.x,
                serverState.y,
                serverState.lastProcessedSeq,
                this.speedMult,
                {
                    dashTimer: serverState.dashTimer || 0,
                    dashCooldown: serverState.dashCooldown || 0,
                    dashDx: serverState.dashDx || 0,
                    dashDy: serverState.dashDy || 0
                }
            );
            this.x = corrected.x;
            this.y = corrected.y;
            this.dashTimer = corrected.dashTimer;
            this.dashCooldown = corrected.dashCooldown;
            this.dashDx = corrected.dashDx;
            this.dashDy = corrected.dashDy;
        } else {
            // Нет seq — просто принять серверную позицию
            this.x = serverState.x;
            this.y = serverState.y;
            this.dashTimer = serverState.dashTimer || 0;
            this.dashCooldown = serverState.dashCooldown || 0;
            this.dashDx = serverState.dashDx || 0;
            this.dashDy = serverState.dashDy || 0;
        }
    }
}
