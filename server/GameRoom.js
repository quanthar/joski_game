import {
    SERVER_TICK_MS, BROADCAST_EVERY_N_TICKS,
    PISTOL_DAMAGE, PLAYER_RADIUS,
    RESPAWN_TIME_MS, BULLET_RADIUS,
    RIFLE_DAMAGE, RIFLE_SPREAD,
    SHOTGUN_DAMAGE, SHOTGUN_SPREAD, SHOTGUN_PELLETS,
    ROCKET_DAMAGE, ROCKET_EXPLOSION_DAMAGE, ROCKET_EXPLOSION_RADIUS, ROCKET_SPEED,
    ITEM_RADIUS, ITEM_SPAWN_INTERVAL_MS, ITEM_SPAWN_PADDING, WORLD_W, WORLD_H
} from '../shared/constants.js';
import { encode, MSG } from '../shared/protocol.js';
import { ServerPlayer } from './ServerPlayer.js';
import { ServerBullet } from './ServerBullet.js';
import { MapManager } from './MapManager.js';
import { bulletHitsPlayer, circleVsAABB } from '../shared/Physics.js';

/**
 * GameRoom — одна комната / матч.
 * Управляет game loop (60Hz), broadcast (20Hz), пулями, коллизиями, респавном и счётом.
 */
export class GameRoom {
    constructor() {
        /** @type {Map<string, { player: ServerPlayer, ws: WebSocket }>} */
        this.clients = new Map();

        /** @type {ServerBullet[]} */
        this.bullets = [];

        /** @type {{ playerId: string, timer: number }[]} */
        this.respawnQueue = [];

        this.items = new Map();
        this.nextItemId = 1;

        // Таймеры и логика
        this.tick = 0;
        this.itemSpawnTimer = 0;

        // Изначальный спавн 20 предметов
        for (let i = 0; i < 20; i++) {
            this._spawnItem();
        }

        this.map = new MapManager();

        this._interval = setInterval(() => this._tick(), SERVER_TICK_MS);
        console.log(`[Room] Game loop запущен (tick=${SERVER_TICK_MS.toFixed(1)}ms)`);
    }

    addPlayer(id, name, ws, heroType = 'scout') {
        const spawn = this.map.getSpawnPoint();
        const player = new ServerPlayer(id, name, spawn.x, spawn.y, heroType);
        this.clients.set(id, { player, ws });

        console.log(`[Room] Игрок добавлен: ${name} (${heroType}) at (${spawn.x}, ${spawn.y})`);

        this._broadcast(encode(MSG.PLAYER_JOIN, {
            id, name, heroType, x: spawn.x, y: spawn.y,
        }), id);

        return player;
    }

    removePlayer(id) {
        const entry = this.clients.get(id);
        if (!entry) return;

        console.log(`[Room] Игрок удалён: ${entry.player.name} (id=${id})`);
        this.clients.delete(id);

        // Убрать из очереди респавна
        this.respawnQueue = this.respawnQueue.filter(r => r.playerId !== id);

        this._broadcast(encode(MSG.PLAYER_LEAVE, { id }));
    }

    handleInput(id, data) {
        const entry = this.clients.get(id);
        if (!entry) return;

        entry.player.setInput(
            data.dx || 0,
            data.dy || 0,
            data.rotation || 0,
            data.seq,
            data.shoot || false,
            data.reload || false,
            data.sprint || false
        );
    }

    getPlayersInfo() {
        const result = [];
        for (const [, { player }] of this.clients) {
            result.push(player.toSnapshot());
        }
        return result;
    }

    /**
     * Получить таблицу очков.
     */
    getScoreboard() {
        const scores = {};
        for (const [, { player }] of this.clients) {
            scores[player.id] = {
                name: player.name,
                frags: player.frags,
                deaths: player.deaths,
            };
        }
        return scores;
    }

    // ── Приватные методы ──────────────────────────────

    _tick() {
        const dt = SERVER_TICK_MS / 1000;

        // 1. Обновить игроков
        for (const [, { player }] of this.clients) {
            player.update(dt, this.map);
        }

        // 2. Стрельба
        this._processShoting();

        // 3. Обновить пули
        for (const bullet of this.bullets) {
            bullet.update(dt);
        }

        // 4. Коллизии
        this._checkBulletCollisions();
        this._checkItemCollisions();

        // 5. Удалить мёртвые пули
        this.bullets = this.bullets.filter(b => b.alive);

        // Спавн предметов
        this.itemSpawnTimer -= SERVER_TICK_MS;
        if (this.itemSpawnTimer <= 0) {
            this.itemSpawnTimer = ITEM_SPAWN_INTERVAL_MS;
            this._spawnItem();
        }

        // 6. Респавн
        this._processRespawns(dt);

        // 7. Broadcast
        this.tick++;
        if (this.tick % BROADCAST_EVERY_N_TICKS === 0) {
            this._broadcastSnapshot();
        }
    }

    _processShoting() {
        for (const [id, { player }] of this.clients) {
            if (!player.wantsToShoot || !player.alive) continue;

            if (player.tryShoot()) {
                const rotation = player.rotation;

                if (player.weaponType === 'shotgun') {
                    // Разброс дробовика
                    for (let i = 0; i < SHOTGUN_PELLETS; i++) {
                        const spread = (Math.random() - 0.5) * SHOTGUN_SPREAD;
                        const dirX = Math.cos(rotation + spread);
                        const dirY = Math.sin(rotation + spread);
                        const spawnX = player.x + dirX * (PLAYER_RADIUS + 5);
                        const spawnY = player.y + dirY * (PLAYER_RADIUS + 5);
                        this.bullets.push(new ServerBullet(id, spawnX, spawnY, dirX, dirY, 'shotgun'));
                    }
                } else {
                    let spread = 0;
                    if (player.weaponType === 'rifle') spread = (Math.random() - 0.5) * RIFLE_SPREAD;

                    const dirX = Math.cos(rotation + spread);
                    const dirY = Math.sin(rotation + spread);
                    const spawnX = player.x + dirX * (PLAYER_RADIUS + 5);
                    const spawnY = player.y + dirY * (PLAYER_RADIUS + 5);

                    const bullet = new ServerBullet(id, spawnX, spawnY, dirX, dirY, player.weaponType);
                    if (player.weaponType === 'rocket') {
                        bullet.speed = ROCKET_SPEED;
                    }
                    this.bullets.push(bullet);
                }
            }
        }
    }

    _checkBulletCollisions() {
        const walls = this.map.getWalls();

        for (const bullet of this.bullets) {
            if (!bullet.alive) continue;

            for (const wall of walls) {
                if (circleVsAABB(bullet.x, bullet.y, BULLET_RADIUS, wall)) {
                    bullet.alive = false;
                    if (bullet.type === 'rocket') {
                        this._explode(bullet.x, bullet.y, bullet.ownerId);
                    }
                    break;
                }
            }

            if (!bullet.alive) continue;

            for (const [id, { player }] of this.clients) {
                if (id === bullet.ownerId) continue;
                if (!player.alive) continue;

                if (bulletHitsPlayer(bullet, player)) {
                    bullet.alive = false;

                    let baseDmg = PISTOL_DAMAGE;
                    if (bullet.type === 'rifle') baseDmg = RIFLE_DAMAGE;
                    if (bullet.type === 'shotgun') baseDmg = SHOTGUN_DAMAGE;
                    if (bullet.type === 'rocket') {
                        baseDmg = ROCKET_DAMAGE;
                        this._explode(bullet.x, bullet.y, bullet.ownerId);
                    }

                    // ── ПАСХАЛКА: One-shot kill ──
                    const killerEntry = this.clients.get(bullet.ownerId);
                    const damage = (killerEntry && killerEntry.player.oneShot) ? 1000 : baseDmg;

                    const killed = player.takeDamage(damage);

                    // HIT всем
                    this._broadcast(encode(MSG.HIT, {
                        targetId: id,
                        damage: damage,
                        killerId: bullet.ownerId,
                        killed,
                        targetHp: player.hp,
                    }));

                    if (killed) {
                        this._onPlayerKilled(id, bullet.ownerId);
                    }

                    break;
                }
            }
        }
    }

    /**
     * Взрыв ракеты (урон по площади).
     */
    _explode(x, y, killerId) {
        // Эффект взрыва
        for (const [id, { player }] of this.clients) {
            if (!player.alive) continue;

            const dx = player.x - x;
            const dy = player.y - y;
            const distSq = dx * dx + dy * dy;

            if (distSq < ROCKET_EXPLOSION_RADIUS * ROCKET_EXPLOSION_RADIUS) {
                const dist = Math.sqrt(distSq);
                const falloff = 1 - (dist / ROCKET_EXPLOSION_RADIUS);
                const damage = Math.round(ROCKET_EXPLOSION_DAMAGE * falloff);

                if (damage <= 0) continue;

                const killed = player.takeDamage(damage);

                this._broadcast(encode(MSG.HIT, {
                    targetId: id,
                    damage,
                    killerId,
                    killed,
                    targetHp: player.hp,
                }));

                if (killed) {
                    this._onPlayerKilled(id, killerId);
                }
            }
        }
    }

    _onPlayerKilled(victimId, killerId) {
        const killerEntry = this.clients.get(killerId);
        const victimEntry = this.clients.get(victimId);
        if (!victimEntry) return;

        if (killerEntry && victimId !== killerId) {
            killerEntry.player.frags++;
        }

        console.log(`[Room] ${killerId} убил ${victimId}`);

        this._broadcast(encode(MSG.PLAYER_DEATH, {
            id: victimId,
            killerId,
            killerName: killerEntry?.player.name || '???',
            victimName: victimEntry.player.name,
        }));

        this._broadcast(encode(MSG.SCORE_UPDATE, {
            scores: this.getScoreboard(),
        }));

        this.respawnQueue.push({
            playerId: victimId,
            timer: RESPAWN_TIME_MS,
        });
    }

    /**
     * Обработать очередь респавна.
     */
    _processRespawns(dt) {
        const dtMs = dt * 1000;
        const toRespawn = [];

        for (const entry of this.respawnQueue) {
            entry.timer -= dtMs;
            if (entry.timer <= 0) {
                toRespawn.push(entry.playerId);
            }
        }

        for (const playerId of toRespawn) {
            const clientEntry = this.clients.get(playerId);
            if (!clientEntry) continue;

            const spawn = this.map.getSpawnPoint();
            clientEntry.player.respawn(spawn.x, spawn.y);

            console.log(`[Room] Респавн: ${clientEntry.player.name} (id=${playerId}) at (${spawn.x}, ${spawn.y})`);

            this._broadcast(encode(MSG.PLAYER_RESPAWN, {
                id: playerId,
                x: spawn.x,
                y: spawn.y,
            }));
        }

        // Удалить отработанные записи
        this.respawnQueue = this.respawnQueue.filter(r => r.timer > 0);
    }

    _checkItemCollisions() {
        for (const [, { player }] of this.clients) {
            if (!player.alive) continue;

            for (const [itemId, item] of this.items) {
                const dx = player.x - item.x;
                const dy = player.y - item.y;
                const distSq = dx * dx + dy * dy;
                const rSum = PLAYER_RADIUS + ITEM_RADIUS;

                if (distSq < rSum * rSum) {
                    // Collect item
                    this._collectItem(player, item);
                    this.items.delete(itemId);
                }
            }
        }
    }

    _collectItem(player, item) {
        switch (item.type) {
            case 'medkit':
                player.hp = Math.min(player.hp + 50, player.maxHp);
                break;
            case 'speed':
                player.speedMult = Math.min(player.speedMult + 0.3, 1.8);
                break;
            case 'rifle':
            case 'shotgun':
            case 'rocket':
                player.setWeapon(item.type);
                break;
        }
    }

    _spawnItem() {
        const types = ['medkit', 'speed', 'rifle', 'shotgun', 'rocket'];
        const type = types[Math.floor(Math.random() * types.length)];
        let x, y;
        let valid = false;

        for (let i = 0; i < 10; i++) { // try up to 10 times
            x = ITEM_SPAWN_PADDING + Math.random() * (WORLD_W - 2 * ITEM_SPAWN_PADDING);
            y = ITEM_SPAWN_PADDING + Math.random() * (WORLD_H - 2 * ITEM_SPAWN_PADDING);

            valid = true;
            const walls = this.map.getWalls();
            for (const wall of walls) {
                if (circleVsAABB(x, y, ITEM_RADIUS, wall)) {
                    valid = false;
                    break;
                }
            }
            if (valid) break;
        }

        if (valid) {
            this.items.set(String(this.nextItemId++), { id: String(this.nextItemId - 1), x, y, type });
        }
    }

    _broadcastSnapshot() {
        const players = [];
        for (const [, { player }] of this.clients) {
            players.push(player.toSnapshot());
        }

        const bullets = [];
        for (const bullet of this.bullets) {
            if (bullet.alive) {
                bullets.push(bullet.toSnapshot());
            }
        }

        const items = Array.from(this.items.values());

        const snapshot = encode(MSG.SNAPSHOT, {
            players,
            bullets,
            items,
            tick: this.tick,
        });

        this._broadcast(snapshot);
    }

    _broadcast(message, excludeId = null) {
        for (const [id, { ws }] of this.clients) {
            if (id !== excludeId && ws.readyState === ws.OPEN) {
                ws.send(message);
            }
        }
    }

    destroy() {
        clearInterval(this._interval);
        console.log('[Room] Game loop остановлен');
    }
}
