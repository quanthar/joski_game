import {
    PLAYER_SPEED, PLAYER_SPRINT_SPEED, PLAYER_RADIUS, WORLD_W, WORLD_H,
} from '@shared/constants.js';
import { clamp } from '@shared/math.js';

/**
 * Prediction — client-side prediction + server reconciliation.
 *
 * Хранит буфер непотверждённых INPUT-ов. При получении серверного снапшота
 * удаляет подтверждённые, берёт серверную позицию и переприменяет оставшиеся.
 */
export class Prediction {
    constructor() {
        /** @type {{ seq: number, dx: number, dy: number, dt: number, sprint: boolean }[]} */
        this.pendingInputs = [];
    }

    /**
     * Добавить INPUT в буфер (вызывается каждый кадр).
     */
    addInput(seq, dx, dy, dt, sprint = false) {
        this.pendingInputs.push({ seq, dx, dy, dt, sprint });
    }

    /**
     * Server reconciliation.
     * 1. Удалить все INPUT-ы с seq ≤ lastProcessedSeq (сервер их уже обработал)
     * 2. Начать с серверной позиции
     * 3. Переприменить оставшиеся INPUT-ы
     * @returns {{ x: number, y: number }}
     */
    reconcile(serverX, serverY, lastProcessedSeq, speedMult = 1.0) {
        // Удалить подтверждённые
        this.pendingInputs = this.pendingInputs.filter(
            input => input.seq > lastProcessedSeq
        );

        // Переприменить оставшиеся
        let x = serverX;
        let y = serverY;

        for (const input of this.pendingInputs) {
            const baseSpeed = input.sprint ? PLAYER_SPRINT_SPEED : PLAYER_SPEED;
            const speed = baseSpeed * speedMult;
            x += input.dx * speed * input.dt;
            y += input.dy * speed * input.dt;
            x = clamp(x, PLAYER_RADIUS, WORLD_W - PLAYER_RADIUS);
            y = clamp(y, PLAYER_RADIUS, WORLD_H - PLAYER_RADIUS);
        }

        return { x, y };
    }

    /**
     * Очистить буфер.
     */
    clear() {
        this.pendingInputs.length = 0;
    }
}
