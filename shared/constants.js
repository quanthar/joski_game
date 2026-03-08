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
export const DASH_DURATION_MS = 200;
export const DASH_SPEED_MULTIPLIER = 3.0;
export const DASH_COOLDOWN_MS = 2000;

// ── Предметы (Items) ───────────────────────────
export const ITEM_RADIUS = 12;
export const ITEM_SPAWN_INTERVAL_MS = 5000;
export const ITEM_SPAWN_PADDING = 300; // Отступ от краев карты для спавна

// ── Оружие: Пистолет ───────────────────────────
export const PISTOL_DAMAGE = 25;
export const PISTOL_FIRE_RATE = 5;             // выстрелов/с
export const PISTOL_FIRE_COOLDOWN_MS = 1000 / PISTOL_FIRE_RATE;
export const PISTOL_MAG_SIZE = 12;
export const PISTOL_RELOAD_TIME_MS = 1200;

// ── Оружие: Автомат (Rifle) ─────────────────────
export const RIFLE_DAMAGE = 18;
export const RIFLE_FIRE_RATE = 10;            // выстрелов/с
export const RIFLE_FIRE_COOLDOWN_MS = 1000 / RIFLE_FIRE_RATE;
export const RIFLE_MAG_SIZE = 30;
export const RIFLE_RELOAD_TIME_MS = 2000;
export const RIFLE_SPREAD = 0.08;             // разброс в радианах

// ── Оружие: Дробовик (Shotgun) ──────────────────
export const SHOTGUN_DAMAGE = 15;             // за 1 дробь
export const SHOTGUN_PELLETS = 6;             // дробинок за выстрел
export const SHOTGUN_FIRE_RATE = 1.2;
export const SHOTGUN_FIRE_COOLDOWN_MS = 1000 / SHOTGUN_FIRE_RATE;
export const SHOTGUN_MAG_SIZE = 5;
export const SHOTGUN_RELOAD_TIME_MS = 2500;
export const SHOTGUN_SPREAD = 0.25;

// ── Оружие: Ракетница (Rocket) ──────────────────
export const ROCKET_DAMAGE = 80;               // прямой урон
export const ROCKET_EXPLOSION_DAMAGE = 60;     // макс. урон по площади
export const ROCKET_EXPLOSION_RADIUS = 120;
export const ROCKET_FIRE_RATE = 0.8;
export const ROCKET_FIRE_COOLDOWN_MS = 1000 / ROCKET_FIRE_RATE;
export const ROCKET_MAG_SIZE = 3;
export const ROCKET_RELOAD_TIME_MS = 3000;
export const ROCKET_SPEED = 1000;

// ── Пуля ───────────────────────────────────────
export const BULLET_SPEED = 1600;              // px/s
export const BULLET_RADIUS = 3;
export const BULLET_MAX_LIFETIME_MS = 2000;    // макс. время жизни

// ── Очки ───────────────────────────────────────
export const FRAG_LIMIT = 20;                  // побеждает первый до N фрагов
