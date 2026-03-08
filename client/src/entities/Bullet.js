import { BULLET_SPEED, BULLET_RADIUS, ROCKET_SPEED } from '@shared/constants.js';

/**
 * Bullet — клиентский визуал пули с экстраполяцией.
 */
export class Bullet {
    constructor() {
        this.id = '';
        this.x = 0;
        this.y = 0;
        this.dirX = 0;
        this.dirY = 0;
        this.ownerId = '';
        this.alive = false;
        this.type = 'pistol';
        this.speed = BULLET_SPEED;
        this.snapshotBuffer = [];
    }

    init(id, x, y, dirX, dirY, ownerId, type = 'pistol') {
        this.id = id;
        this.x = x;
        this.y = y;
        this.dirX = dirX;
        this.dirY = dirY;
        this.ownerId = ownerId;
        this.type = type;
        this.speed = (type === 'rocket') ? ROCKET_SPEED : BULLET_SPEED;
        this.alive = true;

        // Extrapolate ahead ~50ms to compensate for server latency
        this.x = x + dirX * this.speed * 0.05;
        this.y = y + dirY * this.speed * 0.05;
    }

    /**
     * Плавное обновление позиции.
     * Мы не используем интерполяцию для быстрых снарядов (таких как пули),
     * потому что они не меняют траекторию и интерполяция в прошлое вызывает дублирование.
     */
    update(dt) {
        if (!this.alive) return;

        this.x += this.dirX * this.speed * dt;
        this.y += this.dirY * this.speed * dt;
    }

    /**
     * Синхронизация с сервером.
     * Мы игнорируем координаты со снапшотов для пуль, так как они летят по прямой.
     * Принятие координат со снапшота заставило бы пулю отпрыгивать назад.
     */
    updateFromSnapshot(data) {
        if (data.rotation !== undefined) {
            this.dirX = Math.cos(data.rotation);
            this.dirY = Math.sin(data.rotation);
        }
    }

    kill() {
        this.alive = false;
    }

    reset() {
        this.id = '';
        this.x = 0;
        this.y = 0;
        this.dirX = 0;
        this.dirY = 0;
        this.ownerId = '';
        this.alive = false;
        this.type = 'pistol';
        this.speed = BULLET_SPEED;
        this.snapshotBuffer = [];
    }
}
