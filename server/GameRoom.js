import {
    SERVER_TICK_MS, BROADCAST_EVERY_N_TICKS,
    PISTOL_DAMAGE, PLAYER_RADIUS,
    RESPAWN_TIME_MS, BULLET_RADIUS,
} from '../shared/constants.js';
import { encode, MSG } from '../shared/protocol.js';
import { ServerPlayer } from './ServerPlayer.js';
import { ServerBullet } from './ServerBullet.js';
import { MapManager } from './MapManager.js';
import { bulletHitsPlayer, circleVsAABB } from './Physics.js';

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

        this.map = new MapManager();
        this.tick = 0;

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

        // 5. Удалить мёртвые пули
        this.bullets = this.bullets.filter(b => b.alive);

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
                const dirX = Math.cos(player.rotation);
                const dirY = Math.sin(player.rotation);
                const spawnX = player.x + dirX * (PLAYER_RADIUS + 5);
                const spawnY = player.y + dirY * (PLAYER_RADIUS + 5);
                const bullet = new ServerBullet(id, spawnX, spawnY, dirX, dirY);
                this.bullets.push(bullet);
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
                    break;
                }
            }

            if (!bullet.alive) continue;

            for (const [id, { player }] of this.clients) {
                if (id === bullet.ownerId) continue;
                if (!player.alive) continue;

                if (bulletHitsPlayer(bullet, player)) {
                    bullet.alive = false;

                    const killed = player.takeDamage(PISTOL_DAMAGE);

                    // HIT всем
                    this._broadcast(encode(MSG.HIT, {
                        targetId: id,
                        damage: PISTOL_DAMAGE,
                        killerId: bullet.ownerId,
                        killed,
                        targetHp: player.hp,
                    }));

                    if (killed) {
                        // Добавить фраг убийце
                        const killerEntry = this.clients.get(bullet.ownerId);
                        if (killerEntry) {
                            killerEntry.player.frags++;
                        }

                        console.log(`[Room] ${bullet.ownerId} убил ${id}`);

                        // PLAYER_DEATH
                        this._broadcast(encode(MSG.PLAYER_DEATH, {
                            id,
                            killerId: bullet.ownerId,
                            killerName: killerEntry?.player.name || '???',
                            victimName: player.name,
                        }));

                        // SCORE_UPDATE
                        this._broadcast(encode(MSG.SCORE_UPDATE, {
                            scores: this.getScoreboard(),
                        }));

                        // Добавить в очередь респавна
                        this.respawnQueue.push({
                            playerId: id,
                            timer: RESPAWN_TIME_MS,
                        });
                    }

                    break;
                }
            }
        }
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

        const snapshot = encode(MSG.SNAPSHOT, {
            players,
            bullets,
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
