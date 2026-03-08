import {
    BULLET_SPEED, BULLET_RADIUS, BULLET_MAX_LIFETIME_MS,
    WORLD_W, WORLD_H,
} from '../shared/constants.js';

let nextBulletId = 1;

/**
 * ServerBullet — авторитарная серверная пуля.
 */
export class ServerBullet {
    /**
     * @param {string} ownerId — ID игрока-владельца
     * @param {number} x — стартовая позиция
     * @param {number} y
     * @param {number} dirX — нормализованное направление
     * @param {number} dirY
     */
    constructor(ownerId, x, y, dirX, dirY, type = 'pistol') {
        this.id = String(nextBulletId++);
        this.ownerId = ownerId;
        this.x = x;
        this.y = y;
        this.dirX = dirX;
        this.dirY = dirY;
        this.type = type;
        this.speed = BULLET_SPEED;
        this.alive = true;
        this.age = 0; // мс
    }

    /**
     * Обновить позицию пули.
     * @param {number} dt — время тика в секундах
     */
    update(dt) {
        if (!this.alive) return;

        this.x += this.dirX * this.speed * dt;
        this.y += this.dirY * this.speed * dt;
        this.age += dt * 1000;

        // Уничтожить если вылетела за мир или истекло время
        if (
            this.x < -BULLET_RADIUS || this.x > WORLD_W + BULLET_RADIUS ||
            this.y < -BULLET_RADIUS || this.y > WORLD_H + BULLET_RADIUS ||
            this.age >= BULLET_MAX_LIFETIME_MS
        ) {
            this.alive = false;
        }
    }

    /**
     * Данные для снапшота.
     */
    toSnapshot() {
        return {
            id: this.id,
            x: Math.round(this.x),
            y: Math.round(this.y),
            rotation: Math.atan2(this.dirY, this.dirX),
            ownerId: this.ownerId,
            type: this.type,
        };
    }
}
