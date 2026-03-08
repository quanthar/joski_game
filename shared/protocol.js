/**
 * Protocol — единый формат сообщений клиент↔сервер.
 * Используем JSON для простоты MVP (бинарный можно добавить позже).
 */

// ── Типы сообщений ────────────────────────────────────
export const MSG = {
    // Client → Server
    INPUT: 'INPUT',          // { dx, dy, rotation, shoot, reload, seq }
    JOIN: 'JOIN',           // { name }

    // Server → Client
    SNAPSHOT: 'SNAPSHOT',       // { players: [...], bullets: [...], tick }
    PLAYER_JOIN: 'PLAYER_JOIN',    // { id, name, x, y }
    PLAYER_LEAVE: 'PLAYER_LEAVE',  // { id }
    WELCOME: 'WELCOME',       // { id, players, map }
    HIT: 'HIT',           // { targetId, damage, killerId, killed }
    PLAYER_DEATH: 'PLAYER_DEATH',  // { id, killerId }
    PLAYER_RESPAWN: 'PLAYER_RESPAWN',// { id, x, y }
    SCORE_UPDATE: 'SCORE_UPDATE',  // { scores: { [id]: frags } }
};

/**
 * Создать сообщение.
 */
export function encode(type, data = {}) {
    return JSON.stringify({ t: type, d: data });
}

/**
 * Распарсить сообщение.
 * @returns {{ type: string, data: object } | null}
 */
export function decode(raw) {
    try {
        const msg = JSON.parse(raw);
        return { type: msg.t, data: msg.d };
    } catch {
        return null;
    }
}
