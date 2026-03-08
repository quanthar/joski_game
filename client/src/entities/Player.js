import {
    PLAYER_SPEED, PLAYER_SPRINT_SPEED, PLAYER_RADIUS, PLAYER_MAX_HP,
    WORLD_W, WORLD_H, PISTOL_MAG_SIZE,
} from '@shared/constants.js';
import { clamp } from '@shared/math.js';
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
        this.ammo = PISTOL_MAG_SIZE;
        this.reloading = false;

        this.heroType = 'scout';
        this.speedMult = 1.0;

        this.prediction = new Prediction();
    }

    /**
     * Применить ввод локально (prediction) и сохранить в буфер.
     * @param {number} seq — порядковый номер INPUT-а
     * @param {number} dx — нормализованное направление
     * @param {number} dy
     * @param {number} dt — delta time в секундах
     */
    applyInput(seq, dx, dy, dt, sprint = false) {
        // Локальное движение
        const baseSpeed = sprint ? PLAYER_SPRINT_SPEED : PLAYER_SPEED;
        const speed = baseSpeed * this.speedMult;
        this.x += dx * speed * dt;
        this.y += dy * speed * dt;
        this.x = clamp(this.x, PLAYER_RADIUS, WORLD_W - PLAYER_RADIUS);
        this.y = clamp(this.y, PLAYER_RADIUS, WORLD_H - PLAYER_RADIUS);

        // Сохранить в буфер для reconciliation
        this.prediction.addInput(seq, dx, dy, dt, sprint);
    }

    /**
     * Обработать серверный снапшот — reconciliation.
     */
    onServerUpdate(serverState) {
        this.hp = serverState.hp;
        this.maxHp = serverState.maxHp || this.maxHp;

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
                this.speedMult
            );
            this.x = corrected.x;
            this.y = corrected.y;
        } else {
            // Нет seq — просто принять серверную позицию
            this.x = serverState.x;
            this.y = serverState.y;
        }
    }
}
