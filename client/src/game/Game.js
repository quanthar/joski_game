import {
    PLAYER_SPEED, PLAYER_SPRINT_SPEED, PLAYER_RADIUS, PLAYER_MAX_HP,
    WORLD_W, WORLD_H, BULLET_RADIUS, PISTOL_MAG_SIZE,
    RESPAWN_TIME_MS,
} from '@shared/constants.js';
import { angleTo, clamp } from '@shared/math.js';
import { MSG } from '@shared/protocol.js';
import { InputManager } from './InputManager.js';
import { Camera } from './Camera.js';
import { Renderer } from './Renderer.js';
import { NetClient } from '../net/Client.js';
import { Player } from '../entities/Player.js';
import { RemotePlayer } from '../entities/RemotePlayer.js';
import { Bullet } from '../entities/Bullet.js';
import { ObjectPool } from '../systems/ObjectPool.js';
import { Lobby } from './Lobby.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { AudioManager } from '../systems/AudioManager.js';
import { HEROES } from '@shared/heroes.js';

const REMOTE_COLORS = [
    '#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c',
    '#4dabf7', '#cc5de8', '#ff8787', '#20c997',
];

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.input = new InputManager(canvas);
        this.camera = new Camera(canvas.width, canvas.height);
        this.renderer = new Renderer(canvas);

        this.net = new NetClient();
        this.netStatus = 'disconnected';

        this.lobby = new Lobby();

        this.inGame = false;
        this.myId = null;
        this.player = new Player(WORLD_W / 2, WORLD_H / 2, 'Me');
        this.player.alive = false; // until joined

        this.remotePlayers = new Map();

        this.bullets = new Map();
        this.bulletPool = new ObjectPool(
            () => new Bullet(),
            (b) => b.reset(),
            20,
        );

        this._inputSeq = 0;

        // Death state
        this.isDead = false;
        this.deathTimer = 0;         // сколько осталось до респавна (мс)
        this.killedByName = '';      // кто убил

        // Scoreboard
        this.scores = {};            // { id: { name, frags, deaths } }
        this.showScoreboard = false;

        // Kill feed
        this.killFeed = [];          // [{ killerName, victimName, time }]

        this.particles = new ParticleSystem();
        this.audio = new AudioManager();

        // FPS
        this._lastTime = performance.now();
        this._frameCount = 0;
        this._fpsDisplay = 0;
        this._fpsTimer = 0;

        this._resize();
        window.addEventListener('resize', () => this._resize());

        this.lobby.onJoin((name) => {
            if (this.inGame) return;
            const hero = HEROES[Math.floor(Math.random() * HEROES.length)];
            this.player.name = name;
            this.player.heroType = hero.type;
            this.lobby.setStatus(`Playing as ${hero.name}...`);
            this._initNet(name, hero.type);
        });
    }

    async _initNet(playerName, heroType) {
        try {
            this.netStatus = 'connecting...';
            this.lobby.setStatus('Connecting to server (ws://localhost:3000)...');

            await this.net.connect();

            this.lobby.setStatus('Joining room...');
            this.net.sendJoin(playerName, heroType);

            this.net.on(MSG.SNAPSHOT, (data) => {
                if (!this.myId) return; // Wait for WELCOME
                this._onSnapshot(data);
            });
            this.net.on(MSG.HIT, (data) => this._onHit(data));

            this.net.on(MSG.PLAYER_DEATH, (data) => {
                // Kill feed
                this.killFeed.push({
                    killerName: data.killerName,
                    victimName: data.victimName,
                    time: performance.now(),
                });
                if (this.killFeed.length > 5) this.killFeed.shift();

                if (data.id === this.myId) {
                    this.isDead = true;
                    this.deathTimer = RESPAWN_TIME_MS;
                    this.killedByName = data.killerName;
                    this.player.alive = false;
                    this.camera.shake(20);
                    this.audio.playDeath();
                }

                const victim = data.id === this.myId ? this.player : this.remotePlayers.get(data.id);
                if (victim) {
                    this.particles.emit(victim.x, victim.y, '#ff4444', 20);
                }
            });

            this.net.on(MSG.PLAYER_RESPAWN, (data) => {
                if (data.id === this.myId) {
                    this.isDead = false;
                    this.deathTimer = 0;
                    this.player.alive = true;
                    this.player.x = data.x;
                    this.player.y = data.y;
                    this.player.hp = PLAYER_MAX_HP;
                    this.player.prediction.clear();
                }
            });

            this.net.on(MSG.SCORE_UPDATE, (data) => {
                this.scores = data.scores || {};
            });

            this.net.on(MSG.PLAYER_JOIN, (data) => {
                if (data.id === this.myId) return;
                const rp = new RemotePlayer(
                    data.id, data.name || `Player${data.id}`,
                    data.x || WORLD_W / 2, data.y || WORLD_H / 2,
                    data.heroType
                );
                this.remotePlayers.set(data.id, rp);
            });

            this.net.on(MSG.PLAYER_LEAVE, (data) => {
                this.remotePlayers.delete(data.id);
            });

            this.net.on(MSG.WELCOME, (data) => {
                this.inGame = true;
                this.lobby.hide();
                this.player.alive = true;
                this.myId = data.id;
                this.netStatus = `connected (id=${this.myId})`;

                if (data.players) {
                    for (const p of data.players) {
                        if (p.id === this.myId) {
                            this.player.x = p.x;
                            this.player.y = p.y;
                            this.player.heroType = p.heroType;
                        } else {
                            const rp = new RemotePlayer(
                                p.id, p.name || `Player${p.id}`, p.x, p.y, p.heroType
                            );
                            rp.rotation = p.rotation || 0;
                            rp.hp = p.hp || 100;
                            this.remotePlayers.set(p.id, rp);
                        }
                    }
                }
            });

            this.net.on('disconnect', () => {
                this.netStatus = 'disconnected';
                this.inGame = false;
                this.lobby.show();
                this.lobby.setStatus('Disconnected from server.');
            });
        } catch (err) {
            this.netStatus = `error: ${err.message}`;
            this.lobby.setStatus(`Connection Error: ${err.message}. Make sure server is running!`);
            console.error('[Game] Не удалось подключиться:', err);
        }
    }

    _onSnapshot(data) {
        if (!data.players) return;
        const now = performance.now();

        for (const p of data.players) {
            if (p.id === this.myId) {
                this.player.onServerUpdate(p);
                this.player.ammo = p.ammo !== undefined ? p.ammo : this.player.ammo;
                this.player.reloading = p.reloading || false;
                this.player.alive = p.alive !== undefined ? p.alive : true;
            } else {
                let rp = this.remotePlayers.get(p.id);
                if (!rp) {
                    rp = new RemotePlayer(p.id, p.name || `Player${p.id}`, p.x, p.y, p.heroType);
                    this.remotePlayers.set(p.id, rp);
                }
                rp.heroType = p.heroType || rp.heroType;
                rp.pushSnapshot(p.x, p.y, p.rotation, p.hp, p.maxHp, now);
                rp.name = p.name || rp.name;
                rp.alive = p.alive !== undefined ? p.alive : true;
            }
        }

        const snapshotIds = new Set(data.players.map(p => p.id));
        for (const id of this.remotePlayers.keys()) {
            if (!snapshotIds.has(id)) {
                this.remotePlayers.delete(id);
            }
        }

        if (data.bullets) {
            const serverBulletIds = new Set();
            for (const sb of data.bullets) {
                serverBulletIds.add(sb.id);
                let bullet = this.bullets.get(sb.id);
                if (!bullet) {
                    bullet = this.bulletPool.acquire();
                    // Мы не знаем dirX/Y из снапшота, но можем вычислить или просто экстраполировать
                    // Для простоты в BULLET_SPEED добавим экстраполяцию
                    bullet.init(sb.id, sb.x, sb.y, Math.cos(sb.rotation || 0), Math.sin(sb.rotation || 0), sb.ownerId);
                    this.bullets.set(sb.id, bullet);
                } else {
                    bullet.updateFromSnapshot(sb);
                }
            }
            for (const [id, bullet] of this.bullets) {
                if (!serverBulletIds.has(id)) {
                    bullet.kill();
                    this.bulletPool.release(bullet);
                    this.bullets.delete(id);
                }
            }
        }
    }

    _onHit(data) {
        if (data.targetId === this.myId) {
            this.player.hp = data.targetHp !== undefined ? data.targetHp : this.player.hp - data.damage;
            this.camera.shake(8);
            this.audio.playHit();
            this.particles.emit(this.player.x, this.player.y, '#ff8888', 8);
        } else {
            const rp = this.remotePlayers.get(data.targetId);
            if (rp) {
                rp.hp = data.targetHp !== undefined ? data.targetHp : rp.hp - data.damage;
                this.particles.emit(rp.x, rp.y, '#ffffff', 5);
                this.audio.playHit();
            }
        }
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.camera.resize(this.canvas.width, this.canvas.height);
    }

    tick(timestamp) {
        const dt = (timestamp - this._lastTime) / 1000;
        this._lastTime = timestamp;

        this._frameCount++;
        this._fpsTimer += dt;
        if (this._fpsTimer >= 1) {
            this._fpsDisplay = this._frameCount;
            this._frameCount = 0;
            this._fpsTimer = 0;
        }

        this._update(dt);
        this._render();
    }

    _update(dt) {
        if (!this.inGame) return;

        const { player, input, camera, net } = this;
        const now = performance.now();

        if (this.isDead) {
            this.deathTimer = Math.max(0, this.deathTimer - dt * 1000);
        }

        this.showScoreboard = input.keys.has('Tab');
        this.killFeed = this.killFeed.filter(kf => now - kf.time < 5000);

        const { dx, dy } = this.isDead ? { dx: 0, dy: 0 } : input.getMovement();
        const isSprinting = input.isSprinting();
        const worldMouse = input.getWorldMouse(camera);
        player.rotation = angleTo(player.x, player.y, worldMouse.x, worldMouse.y);

        const shooting = this.isDead ? false : input.isShooting();

        this._inputSeq++;
        if (dx !== 0 || dy !== 0) {
            player.applyInput(this._inputSeq, dx, dy, dt, isSprinting);
        } else {
            player.prediction.addInput(this._inputSeq, 0, 0, dt, isSprinting);
        }

        if (net.connected) {
            net.sendInput({
                dx, dy,
                rotation: player.rotation,
                seq: this._inputSeq,
                shoot: shooting,
                reload: input.isReloadPressed(),
                sprint: isSprinting,
            });

            if (shooting && !this.isDead) {
                const nowMs = performance.now();
                if (!this._lastShootSoundTime || nowMs - this._lastShootSoundTime > 200) {
                    this.audio.playShoot();
                    this.camera.shake(2);
                    this._lastShootSoundTime = nowMs;
                }
            }
        }

        for (const [, rp] of this.remotePlayers) {
            rp.update(now);
        }

        // Пули
        for (const [, bullet] of this.bullets) {
            bullet.update(dt);
        }

        camera.follow(player.x, player.y);
        camera.update(dt);
        this.particles.update(dt);
    }

    _render() {
        if (!this.inGame) return;

        const { renderer, camera, player, input } = this;
        const worldMouse = input.getWorldMouse(camera);

        renderer.beginFrame(camera);
        renderer.drawMap();

        this.particles.draw(renderer.ctx);

        for (const [, bullet] of this.bullets) {
            if (bullet.alive) {
                renderer.drawBullet(bullet.x, bullet.y, bullet.ownerId === this.myId);
            }
        }

        let colorIdx = 0;
        for (const [id, rp] of this.remotePlayers) {
            if (rp.alive === false) { colorIdx++; continue; }
            const color = REMOTE_COLORS[colorIdx % REMOTE_COLORS.length];
            renderer.drawPlayer(rp.x, rp.y, rp.rotation, color, false, rp.heroType);
            renderer.drawPlayerName(rp.x, rp.y, rp.name);
            renderer.drawHealthBar(rp.x, rp.y, rp.hp, rp.maxHp);
            colorIdx++;
        }

        if (!this.isDead) {
            renderer.drawPlayer(player.x, player.y, player.rotation, '#00ff88', true, player.heroType);
            renderer.drawPlayerName(player.x, player.y, player.name);
            renderer.drawHealthBar(player.x, player.y, player.hp, player.maxHp);
        }

        renderer.drawCrosshair(worldMouse.x, worldMouse.y);
        renderer.endFrame();

        this._drawVignette();

        renderer.drawDebugHUD({
            fps: this._fpsDisplay,
            playerX: player.x,
            playerY: player.y,
            netStatus: this.netStatus,
            playerCount: this.remotePlayers.size + 1,
            ammo: player.ammo !== undefined ? player.ammo : PISTOL_MAG_SIZE,
            reloading: player.reloading || false,
        });

        if (!this.isDead) {
            renderer.drawAmmoBar(
                player.ammo !== undefined ? player.ammo : PISTOL_MAG_SIZE,
                PISTOL_MAG_SIZE,
                player.reloading || false
            );
        }

        renderer.drawKillFeed(this.killFeed);

        if (this.isDead) {
            renderer.drawDeathScreen(this.killedByName, this.deathTimer);
        }

        if (this.showScoreboard) {
            renderer.drawScoreboard(this.scores, this.myId);
        }
    }

    _drawVignette() {
        const { renderer, canvas } = this;
        const { ctx } = renderer;
        const w = canvas.width;
        const h = canvas.height;

        const grad = ctx.createRadialGradient(w / 2, h / 2, w / 4, w / 2, h / 2, w * 0.8);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.5)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }
}
