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
        this.snapshotBuffer = [{ x, y, timestamp: performance.now() }];
    }

    /**
     * Плавное обновление позиции через интерполяцию.
     */
    update(dt) {
        if (!this.alive) return;

        const now = performance.now();
        const renderTime = now - 100; // INTERP_DELAY_MS
        const buffer = this.snapshotBuffer;

        if (buffer.length < 2) {
            // Если данных мало — экстраполируем
            this.x += this.dirX * this.speed * dt;
            this.y += this.dirY * this.speed * dt;
            return;
        }

        // Интерполяция
        let from = null;
        let to = null;
        for (let i = 1; i < buffer.length; i++) {
            if (buffer[i].timestamp >= renderTime) {
                from = buffer[i - 1];
                to = buffer[i];
                break;
            }
        }

        if (from && to) {
            const range = to.timestamp - from.timestamp;
            const t = range > 0 ? (renderTime - from.timestamp) / range : 1;
            this.x = from.x + (to.x - from.x) * t;
            this.y = from.y + (to.y - from.y) * t;
        } else {
            // Либо слишком старое, либо слишком новое — экстраполируем от последнего снапшота
            const last = buffer[buffer.length - 1];
            const timeDiff = (now - last.timestamp) / 1000;
            this.x = last.x + this.dirX * this.speed * timeDiff;
            this.y = last.y + this.dirY * this.speed * timeDiff;
        }

        // Очистка буфера
        while (buffer.length > 2 && buffer[1].timestamp < renderTime) {
            buffer.shift();
        }
    }

    /**
     * Синхронизация с сервером.
     * Мы не "прыгаем" в координату сервера мгновенно, если разница мала.
     */
    updateFromSnapshot(data) {
        this.snapshotBuffer.push({
            x: data.x,
            y: data.y,
            timestamp: performance.now()
        });

        if (this.snapshotBuffer.length > 10) {
            this.snapshotBuffer.shift();
        }

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
