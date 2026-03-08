import {
    PLAYER_SPEED, PLAYER_SPRINT_SPEED, PLAYER_RADIUS, PLAYER_MAX_HP,
    WORLD_W, WORLD_H,
    PISTOL_FIRE_COOLDOWN_MS, PISTOL_MAG_SIZE, PISTOL_RELOAD_TIME_MS,
} from '../shared/constants.js';
import { HEROES } from '../shared/heroes.js';
import { clamp } from '../shared/math.js';
import { resolveCircleAABB } from './Physics.js';

/**
 * ServerPlayer — авторитарная серверная сущность игрока.
 */
export class ServerPlayer {
    constructor(id, name, x, y, heroType = 'scout') {
        this.id = id;
        this.name = name;
        this.heroType = heroType;

        const heroStats = HEROES.find(h => h.type === heroType) || HEROES[0];
        this.speedMult = heroStats.speed;
        this.hpMult = heroStats.hp;

        this.x = x;
        this.y = y;
        this.rotation = 0;

        this.hp = Math.round(PLAYER_MAX_HP * this.hpMult);
        this.maxHp = this.hp;

        // ── ПАСХАЛКА ──────────────────────────────────
        this.oneShot = false;
        if (this.name && this.name.toLowerCase() === 'jitery') {
            this.hp = 1000;
            this.maxHp = 1000;
            this.oneShot = true;
        }
        // ──────────────────────────────────────────────

        this.alive = true;

        this.lastInput = { dx: 0, dy: 0, rotation: 0, sprint: false };
        this.wantsToShoot = false;
        this.lastProcessedSeq = 0;

        // Стрельба
        this.fireCooldown = 0;
        this.ammo = PISTOL_MAG_SIZE;
        this.reloading = false;
        this.reloadTimer = 0;

        // Счёт
        this.frags = 0;
        this.deaths = 0;
    }

    setInput(dx, dy, rotation, seq, shoot = false, reload = false, sprint = false) {
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 1) {
            dx /= len;
            dy /= len;
        }
        this.lastInput.dx = dx;
        this.lastInput.dy = dy;
        this.lastInput.sprint = sprint;
        this.rotation = rotation;
        this.wantsToShoot = shoot;

        if (reload && !this.reloading && this.ammo < PISTOL_MAG_SIZE) {
            this.startReload();
        }

        if (seq !== undefined) {
            this.lastProcessedSeq = seq;
        }
    }

    update(dt, mapManager) {
        if (!this.alive) return;

        const { dx, dy, sprint } = this.lastInput;
        const baseSpeed = sprint ? PLAYER_SPRINT_SPEED : PLAYER_SPEED;
        const speed = baseSpeed * this.speedMult;
        this.x += dx * speed * dt;
        this.y += dy * speed * dt;

        this.x = clamp(this.x, PLAYER_RADIUS, WORLD_W - PLAYER_RADIUS);
        this.y = clamp(this.y, PLAYER_RADIUS, WORLD_H - PLAYER_RADIUS);

        if (mapManager) {
            const walls = mapManager.getWalls();
            for (const wall of walls) {
                const res = resolveCircleAABB(this.x, this.y, PLAYER_RADIUS, wall);
                if (res.collided) {
                    this.x = res.x;
                    this.y = res.y;
                }
            }
        }

        if (this.fireCooldown > 0) {
            this.fireCooldown -= dt * 1000;
        }

        if (this.reloading) {
            this.reloadTimer -= dt * 1000;
            if (this.reloadTimer <= 0) {
                this.ammo = PISTOL_MAG_SIZE;
                this.reloading = false;
                this.reloadTimer = 0;
            }
        }
    }

    tryShoot() {
        if (!this.alive) return false;
        if (this.reloading) return false;
        if (this.fireCooldown > 0) return false;
        if (this.ammo <= 0) {
            this.startReload();
            return false;
        }

        this.ammo--;
        this.fireCooldown = PISTOL_FIRE_COOLDOWN_MS;

        if (this.ammo <= 0) {
            this.startReload();
        }

        return true;
    }

    startReload() {
        if (this.reloading) return;
        if (this.ammo >= PISTOL_MAG_SIZE) return;
        this.reloading = true;
        this.reloadTimer = PISTOL_RELOAD_TIME_MS;
    }

    /**
     * Респавн — сбросить состояние.
     */
    respawn(x, y) {
        this.x = x;
        this.y = y;
        this.hp = this.maxHp;
        this.alive = true;
        this.fireCooldown = 0;
        this.ammo = PISTOL_MAG_SIZE;
        this.reloading = false;
        this.reloadTimer = 0;
        this.lastInput = { dx: 0, dy: 0, rotation: 0, sprint: false };
        this.wantsToShoot = false;
    }

    takeDamage(amount) {
        if (!this.alive) return false;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
            this.deaths++;
            return true;
        }
        return false;
    }

    toSnapshot() {
        return {
            id: this.id,
            name: this.name,
            x: Math.round(this.x * 10) / 10,
            y: Math.round(this.y * 10) / 10,
            rotation: Math.round(this.rotation * 100) / 100,
            hp: this.hp,
            maxHp: this.maxHp,
            heroType: this.heroType,
            alive: this.alive,
            lastProcessedSeq: this.lastProcessedSeq,
            ammo: this.ammo,
            reloading: this.reloading,
        };
    }
}
