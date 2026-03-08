import { WORLD_W, WORLD_H, PLAYER_RADIUS } from '../shared/constants.js';
import { WALLS } from '../shared/map.js';
import { circleVsAABB } from '../shared/Physics.js';

/**
 * MapManager — данные карты: спавн-точки, (в будущем) стены.
 */

// 8 точек, равномерно распределённых по арене
const SPAWN_POINTS = [
    { x: 200, y: 200 },
    { x: WORLD_W - 200, y: 200 },
    { x: 200, y: WORLD_H - 200 },
    { x: WORLD_W - 200, y: WORLD_H - 200 },
    { x: WORLD_W / 2, y: 200 },
    { x: WORLD_W / 2, y: WORLD_H - 200 },
    { x: 200, y: WORLD_H / 2 },
    { x: WORLD_W - 200, y: WORLD_H / 2 },
];

export class MapManager {
    constructor() {
        this.spawnPoints = SPAWN_POINTS;
        this.walls = WALLS;
    }

    getWalls() {
        return this.walls;
    }

    /**
     * Вернуть случайную спавн-точку.
     * @param {Set<string>} [occupiedIds] — ID позиций, которые уже заняты (опционально)
     */
    getSpawnPoint() {
        // Простая попытка найти свободную точку
        for (let i = 0; i < 10; i++) {
            const idx = Math.floor(Math.random() * this.spawnPoints.length);
            const pt = this.spawnPoints[idx];

            let valid = true;
            for (const wall of this.walls) {
                if (circleVsAABB(pt.x, pt.y, PLAYER_RADIUS, wall)) {
                    valid = false;
                    break;
                }
            }

            if (valid) {
                return { ...pt };
            }
        }
        // Если не нашли свободную, возвращаем случайную
        const fallbackIdx = Math.floor(Math.random() * this.spawnPoints.length);
        return { ...this.spawnPoints[fallbackIdx] };
    }

    /**
     * Ограничить позицию границами мира (с учётом радиуса игрока).
     */
    clampToWorld(x, y) {
        const minX = PLAYER_RADIUS;
        const minY = PLAYER_RADIUS;
        const maxX = WORLD_W - PLAYER_RADIUS;
        const maxY = WORLD_H - PLAYER_RADIUS;
        return {
            x: Math.max(minX, Math.min(maxX, x)),
            y: Math.max(minY, Math.min(maxY, y)),
        };
    }
}
