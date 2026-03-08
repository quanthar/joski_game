// ── Мир ────────────────────────────────────────
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const TILE_SIZE = 32;

// ── Сервер ─────────────────────────────────────
export const SERVER_TICK_RATE = 60;            // Hz — серверный тик
export const SERVER_TICK_MS = 1000 / SERVER_TICK_RATE;
export const BROADCAST_RATE = 20;              // Hz — отправка снапшотов
export const BROADCAST_EVERY_N_TICKS = SERVER_TICK_RATE / BROADCAST_RATE; // = 3

// ── Сеть ───────────────────────────────────────
export const SERVER_PORT = 3000;
export const MAX_PLAYERS_PER_ROOM = 8;

// ── Игрок ──────────────────────────────────────
export const PLAYER_SPEED = 200;               // px/s
export const PLAYER_SPRINT_SPEED = 350;        // px/s
export const PLAYER_RADIUS = 16;               // collision circle
export const PLAYER_MAX_HP = 100;
export const RESPAWN_TIME_MS = 5000;

// ── Оружие (пистолет) ─────────────────────────
export const PISTOL_DAMAGE = 25;
export const PISTOL_FIRE_RATE = 5;             // выстрелов/с
export const PISTOL_FIRE_COOLDOWN_MS = 1000 / PISTOL_FIRE_RATE; // = 200 мс
export const PISTOL_MAG_SIZE = 12;
export const PISTOL_RELOAD_TIME_MS = 1500;

// ── Пуля ───────────────────────────────────────
export const BULLET_SPEED = 800;               // px/s
export const BULLET_RADIUS = 3;
export const BULLET_MAX_LIFETIME_MS = 2000;    // макс. время жизни

// ── Очки ───────────────────────────────────────
export const FRAG_LIMIT = 20;                  // побеждает первый до N фрагов
