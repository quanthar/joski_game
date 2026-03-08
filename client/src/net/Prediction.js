import {
    PLAYER_SPEED, PLAYER_SPRINT_SPEED, PLAYER_RADIUS, WORLD_W, WORLD_H,
    DASH_DURATION_MS, DASH_SPEED_MULTIPLIER, DASH_COOLDOWN_MS
} from '@shared/constants.js';
import { clamp } from '@shared/math.js';
import { WALLS } from '@shared/map.js';
import { resolveCircleAABB } from '@shared/Physics.js';

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
    addInput(seq, dx, dy, dt, sprint = false, dash = false, rotation = 0) {
        this.pendingInputs.push({ seq, dx, dy, dt, sprint, dash, rotation });
    }

    /**
     * Server reconciliation.
     * @returns {{ x: number, y: number, dashTimer: number, dashCooldown: number, dashDx: number, dashDy: number }}
     */
    reconcile(serverX, serverY, lastProcessedSeq, speedMult = 1.0, serverDash = null) {
        // Удалить подтверждённые
        this.pendingInputs = this.pendingInputs.filter(
            input => input.seq > lastProcessedSeq
        );

        // Переприменить оставшиеся
        let x = serverX;
        let y = serverY;
        let dT = serverDash ? serverDash.dashTimer : 0;
        let dC = serverDash ? serverDash.dashCooldown : 0;
        let dDx = serverDash ? serverDash.dashDx : 0;
        let dDy = serverDash ? serverDash.dashDy : 0;

        for (const input of this.pendingInputs) {
            if (dC > 0) dC -= input.dt * 1000;

            if (input.dash && dC <= 0 && dT <= 0) {
                dT = DASH_DURATION_MS;
                dC = DASH_COOLDOWN_MS;
                dDx = input.dx !== 0 || input.dy !== 0 ? input.dx : Math.cos(input.rotation);
                dDy = input.dx !== 0 || input.dy !== 0 ? input.dy : Math.sin(input.rotation);
            }

            let speed = (input.sprint ? PLAYER_SPRINT_SPEED : PLAYER_SPEED) * speedMult;
            let moveX = input.dx;
            let moveY = input.dy;

            if (dT > 0) {
                dT -= input.dt * 1000;
                speed = PLAYER_SPEED * DASH_SPEED_MULTIPLIER;
                moveX = dDx;
                moveY = dDy;
            }

            x += moveX * speed * input.dt;
            y += moveY * speed * input.dt;

            // Коллизии со стенами
            for (const wall of WALLS) {
                const res = resolveCircleAABB(x, y, PLAYER_RADIUS, wall);
                if (res.collided) {
                    x = res.x;
                    y = res.y;
                }
            }

            x = clamp(x, PLAYER_RADIUS, WORLD_W - PLAYER_RADIUS);
            y = clamp(y, PLAYER_RADIUS, WORLD_H - PLAYER_RADIUS);
        }

        return { x, y, dashTimer: dT, dashCooldown: dC, dashDx: dDx, dashDy: dDy };
    }

    /**
     * Очистить буфер.
     */
    clear() {
        this.pendingInputs.length = 0;
    }
}
