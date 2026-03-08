import { lerp, clamp } from '@shared/math.js';
import { WORLD_W, WORLD_H } from '@shared/constants.js';

/**
 * Camera — плавное следование за целью.
 * camera.x, camera.y — центр камеры в мировых координатах.
 */
export class Camera {
    constructor(canvasWidth, canvasHeight) {
        this.x = WORLD_W / 2;
        this.y = WORLD_H / 2;
        this.canvasW = canvasWidth;
        this.canvasH = canvasHeight;
        this.smoothing = 0.1; // 0 = мгновенно, 1 = не двигается
        this.shakeAmount = 0;
    }

    resize(canvasWidth, canvasHeight) {
        this.canvasW = canvasWidth;
        this.canvasH = canvasHeight;
    }

    /**
     * Обновить позицию камеры чтобы следовать за targetX, targetY.
     */
    follow(targetX, targetY) {
        this.x = lerp(this.x, targetX, 1 - this.smoothing);
        this.y = lerp(this.y, targetY, 1 - this.smoothing);

        const halfW = this.canvasW / 2;
        const halfH = this.canvasH / 2;

        this.x = clamp(this.x, halfW, Math.max(halfW, WORLD_W - halfW));
        this.y = clamp(this.y, halfH, Math.max(halfH, WORLD_H - halfH));
    }

    shake(amount) {
        this.shakeAmount = Math.max(this.shakeAmount, amount);
    }

    update(dt) {
        if (this.shakeAmount > 0) {
            this.shakeAmount -= dt * 60; // быстрый спад
            if (this.shakeAmount < 0) this.shakeAmount = 0;
        }
    }

    /**
     * Сдвиг для рендеринга: мировые координаты → экранные.
     */
    get offsetX() {
        const sx = (Math.random() - 0.5) * this.shakeAmount;
        return this.canvasW / 2 - this.x + sx;
    }

    get offsetY() {
        const sy = (Math.random() - 0.5) * this.shakeAmount;
        return this.canvasH / 2 - this.y + sy;
    }

    /**
     * Преобразовать мировые координаты в экранные.
     */
    worldToScreen(wx, wy) {
        return {
            x: wx + this.offsetX,
            y: wy + this.offsetY,
        };
    }
}
