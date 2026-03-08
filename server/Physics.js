import { PLAYER_RADIUS, BULLET_RADIUS } from '../shared/constants.js';

/**
 * Physics — серверная физика и проверки коллизий.
 */

/**
 * Проверка попадания пули в игрока (circle vs circle).
 * @param {object} bullet — { x, y }
 * @param {object} player — { x, y }
 * @returns {boolean}
 */
export function bulletHitsPlayer(bullet, player) {
    const dx = bullet.x - player.x;
    const dy = bullet.y - player.y;
    const distSq = dx * dx + dy * dy;
    const radiusSum = BULLET_RADIUS + PLAYER_RADIUS;
    return distSq <= radiusSum * radiusSum;
}

/**
 * Проверка коллизии двух кругов.
 * @param {number} x1
 * @param {number} y1
 * @param {number} r1
 * @param {number} x2
 * @param {number} y2
 * @param {number} r2
 * @returns {boolean}
 */
export function circleVsCircle(x1, y1, r1, x2, y2, r2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distSq = dx * dx + dy * dy;
    const radiusSum = r1 + r2;
    return distSq <= radiusSum * radiusSum;
}

/**
 * Проверка точки внутри AABB.
 * @param {number} px
 * @param {number} py
 * @param {object} rect — { x, y, w, h }
 * @returns {boolean}
 */
export function pointInAABB(px, py, rect) {
    return (
        px >= rect.x && px <= rect.x + rect.w &&
        py >= rect.y && py <= rect.y + rect.h
    );
}

/**
 * Проверка пересечения круга и AABB.
 * @param {number} cx — центр круга X
 * @param {number} cy — центр круга Y
 * @param {number} cr — радиус круга
 * @param {object} rect — { x, y, w, h }
 * @returns {boolean}
 */
export function circleVsAABB(cx, cy, cr, rect) {
    const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) <= (cr * cr);
}

/**
 * Разрешение коллизии круга (игрока) и AABB (стены).
 * @returns {{collided: boolean, x: number, y: number}}
 */
export function resolveCircleAABB(cx, cy, cr, rect) {
    const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const dx = cx - closestX;
    const dy = cy - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < cr * cr) {
        if (distSq === 0) {
            // Центр внутри AABB
            const distLeft = cx - rect.x;
            const distRight = (rect.x + rect.w) - cx;
            const distTop = cy - rect.y;
            const distBottom = (rect.y + rect.h) - cy;

            const minDist = Math.min(distLeft, distRight, distTop, distBottom);

            if (minDist === distLeft) return { collided: true, x: rect.x - cr, y: cy };
            if (minDist === distRight) return { collided: true, x: rect.x + rect.w + cr, y: cy };
            if (minDist === distTop) return { collided: true, x: cx, y: rect.y - cr };
            if (minDist === distBottom) return { collided: true, x: cx, y: rect.y + rect.h + cr };
        } else {
            const dist = Math.sqrt(distSq);
            const overlap = cr - dist;
            const nx = dx / dist;
            const ny = dy / dist;
            return {
                collided: true,
                x: cx + nx * overlap,
                y: cy + ny * overlap
            };
        }
    }
    return { collided: false, x: cx, y: cy };
}

