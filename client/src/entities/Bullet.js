import { BULLET_SPEED, BULLET_RADIUS } from '@shared/constants.js';

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
    }

    /**
     * Инициализировать пулю.
     */
    init(id, x, y, dirX, dirY, ownerId) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.dirX = dirX;
        this.dirY = dirY;
        this.ownerId = ownerId;
        this.alive = true;
    }

    /**
     * Плавное обновление позиции.
     * Если мы обновляем только по snapshot, пуля будет "дергаться" 20 раз в сек.
     * Здесь мы двигаем её каждый кадр (60+ фпс).
     */
    update(dt) {
        if (!this.alive) return;
        this.x += this.dirX * BULLET_SPEED * dt;
        this.y += this.dirY * BULLET_SPEED * dt;
    }

    /**
     * Синхронизация с сервером.
     * Мы не "прыгаем" в координату сервера мгновенно, если разница мала.
     */
    updateFromSnapshot(data) {
        const dx = data.x - this.x;
        const dy = data.y - this.y;
        const distSq = dx * dx + dy * dy;

        // Если разница больше 50 пикселей — значит произошёл рассинхрон, телепортируем.
        // Иначе — позволяем клиентской экстраполяции продолжать движение.
        if (distSq > 2500) {
            this.x = data.x;
            this.y = data.y;
        }

        // Обновляем направление (на случай если оно изменилось, например отскок — хотя у нас его нет)
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
    }
}
