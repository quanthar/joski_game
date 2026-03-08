import { lerp, lerpAngle } from '@shared/math.js';

/**
 * Задержка интерполяции (мс).
 * Рендерим удалённых игроков «в прошлом» для плавности.
 */
const INTERP_DELAY_MS = 100;

/**
 * Максимальный размер буфера снапшотов.
 */
const MAX_BUFFER_SIZE = 10;

/**
 * RemotePlayer — удалённый игрок с entity interpolation.
 *
 * Хранит буфер серверных снапшотов и интерполирует между ними,
 * рендеря позицию «в прошлом» (INTERP_DELAY_MS назад).
 */
export class RemotePlayer {
    constructor(id, name, x, y, heroType = 'scout') {
        this.id = id;
        this.name = name;
        this.heroType = heroType;

        // Текущая отображаемая позиция
        this.x = x;
        this.y = y;
        this.rotation = 0;
        this.hp = 100;
        this.maxHp = 100;
        this.alive = true;

        /**
         * Буфер снапшотов: [{ x, y, rotation, hp, timestamp }]
         * Отсортирован по timestamp (от старого к новому).
         */
        this.snapshotBuffer = [];
    }

    /**
     * Добавить серверный снапшот в буфер.
     * @param {number} x
     * @param {number} y
     * @param {number} rotation
     * @param {number} hp
     * @param {number} timestamp — performance.now() момент получения
     */
    pushSnapshot(x, y, rotation, hp, maxHp, timestamp) {
        this.snapshotBuffer.push({ x, y, rotation, hp, maxHp, timestamp });

        if (maxHp !== undefined) this.maxHp = maxHp;

        // Ограничить размер буфера
        if (this.snapshotBuffer.length > MAX_BUFFER_SIZE) {
            this.snapshotBuffer.shift();
        }
    }

    /**
     * Получить интерполированную позицию для текущего момента.
     * Рендерим «в прошлом» на INTERP_DELAY_MS.
     * @param {number} now — текущий performance.now()
     */
    update(now) {
        const renderTime = now - INTERP_DELAY_MS;
        const buffer = this.snapshotBuffer;

        if (buffer.length === 0) return;

        // Если только 1 снапшот — использовать его напрямую
        if (buffer.length === 1) {
            const s = buffer[0];
            this.x = s.x;
            this.y = s.y;
            this.rotation = s.rotation;
            this.hp = s.hp;
            return;
        }

        // Найти два снапшота, между которыми находится renderTime
        // buffer[i-1].timestamp ≤ renderTime ≤ buffer[i].timestamp
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
            // Интерполяция
            const range = to.timestamp - from.timestamp;
            const t = range > 0 ? (renderTime - from.timestamp) / range : 1;
            const clampedT = Math.max(0, Math.min(1, t));

            this.x = lerp(from.x, to.x, clampedT);
            this.y = lerp(from.y, to.y, clampedT);
            this.rotation = lerpAngle(from.rotation, to.rotation, clampedT);
            this.hp = to.hp; // HP не интерполируем
            this.maxHp = to.maxHp || this.maxHp;
        } else {
            // renderTime за пределами буфера — использовать последний снапшот
            const last = buffer[buffer.length - 1];
            this.x = last.x;
            this.y = last.y;
            this.rotation = last.rotation;
            this.hp = last.hp;
        }

        // Очистить старые снапшоты (оставить минимум 2)
        while (buffer.length > 2 && buffer[1].timestamp < renderTime) {
            buffer.shift();
        }
    }
}
