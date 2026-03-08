import {
    PLAYER_SPEED, PLAYER_SPRINT_SPEED, PLAYER_RADIUS, PLAYER_MAX_HP,
    WORLD_W, WORLD_H,
    PISTOL_FIRE_COOLDOWN_MS, PISTOL_MAG_SIZE, PISTOL_RELOAD_TIME_MS,
    RIFLE_FIRE_COOLDOWN_MS, RIFLE_MAG_SIZE, RIFLE_RELOAD_TIME_MS,
    SHOTGUN_FIRE_COOLDOWN_MS, SHOTGUN_MAG_SIZE, SHOTGUN_RELOAD_TIME_MS,
    ROCKET_FIRE_COOLDOWN_MS, ROCKET_MAG_SIZE, ROCKET_RELOAD_TIME_MS,
    DASH_DURATION_MS, DASH_SPEED_MULTIPLIER, DASH_COOLDOWN_MS
} from '../shared/constants.js';
import { HEROES } from '../shared/heroes.js';
import { clamp } from '../shared/math.js';
import { resolveCircleAABB } from '../shared/Physics.js';

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
        this.weaponType = heroStats.weapon || 'pistol';

        // Weapon Stats
        const wStats = this._getWeaponStats();
        this.maxAmmo = wStats.magSize;
        this.fireCooldownTime = wStats.cooldown;
        this.reloadTime = wStats.reloadTime;

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

        this.lastInput = { dx: 0, dy: 0, rotation: 0, sprint: false, dash: false };
        this.wantsToShoot = false;
        this.lastProcessedSeq = 0;

        // Dash logic
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.dashDx = 0;
        this.dashDy = 0;

        // Стрельба
        this.fireCooldown = 0;
        this.ammo = this.maxAmmo;
        this.reloading = false;
        this.reloadTimer = 0;

        // Счёт
        this.frags = 0;
        this.deaths = 0;
    }

    setInput(dx, dy, rotation, seq, shoot = false, reload = false, sprint = false, dash = false) {
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 1) {
            dx /= len;
            dy /= len;
        }
        this.lastInput.dx = dx;
        this.lastInput.dy = dy;
        this.lastInput.sprint = sprint;
        this.lastInput.dash = dash;
        this.rotation = rotation;
        this.wantsToShoot = shoot;

        if (reload && !this.reloading && this.ammo < this.maxAmmo) {
            this.startReload();
        }

        if (seq !== undefined) {
            this.lastProcessedSeq = seq;
        }
    }

    update(dt, mapManager) {
        if (!this.alive) return;

        let { dx, dy, sprint, dash } = this.lastInput;

        if (this.dashCooldown > 0) this.dashCooldown -= dt * 1000;

        if (dash && this.dashCooldown <= 0 && this.dashTimer <= 0) {
            this.dashTimer = DASH_DURATION_MS;
            this.dashCooldown = DASH_COOLDOWN_MS;
            this.dashDx = dx !== 0 || dy !== 0 ? dx : Math.cos(this.rotation);
            this.dashDy = dx !== 0 || dy !== 0 ? dy : Math.sin(this.rotation);
        }

        let speed = (sprint ? PLAYER_SPRINT_SPEED : PLAYER_SPEED) * this.speedMult;
        let moveX = dx;
        let moveY = dy;

        if (this.dashTimer > 0) {
            this.dashTimer -= dt * 1000;
            speed = PLAYER_SPEED * DASH_SPEED_MULTIPLIER;
            moveX = this.dashDx;
            moveY = this.dashDy;
        }

        this.x += moveX * speed * dt;
        this.y += moveY * speed * dt;

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
                this.ammo = this.maxAmmo;
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
        this.fireCooldown = this.fireCooldownTime;

        if (this.ammo <= 0) {
            this.startReload();
        }

        return true;
    }

    _getWeaponStats() {
        switch (this.weaponType) {
            case 'rifle': return { magSize: RIFLE_MAG_SIZE, cooldown: RIFLE_FIRE_COOLDOWN_MS, reloadTime: RIFLE_RELOAD_TIME_MS };
            case 'shotgun': return { magSize: SHOTGUN_MAG_SIZE, cooldown: SHOTGUN_FIRE_COOLDOWN_MS, reloadTime: SHOTGUN_RELOAD_TIME_MS };
            case 'rocket': return { magSize: ROCKET_MAG_SIZE, cooldown: ROCKET_FIRE_COOLDOWN_MS, reloadTime: ROCKET_RELOAD_TIME_MS };
            default: return { magSize: PISTOL_MAG_SIZE, cooldown: PISTOL_FIRE_COOLDOWN_MS, reloadTime: PISTOL_RELOAD_TIME_MS };
        }
    }

    setWeapon(weaponType) {
        if (this.weaponType === weaponType && this.ammo === this.maxAmmo) return;
        this.weaponType = weaponType;
        const wStats = this._getWeaponStats();
        this.maxAmmo = wStats.magSize;
        this.fireCooldownTime = wStats.cooldown;
        this.reloadTime = wStats.reloadTime;
        this.ammo = this.maxAmmo;
        this.reloading = false;
        this.reloadTimer = 0;
    }

    startReload() {
        if (this.reloading) return;
        if (this.ammo >= this.maxAmmo) return;
        this.reloading = true;
        this.reloadTimer = this.reloadTime;
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
        this.ammo = this.maxAmmo;
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
            weaponType: this.weaponType,
            alive: this.alive,
            lastProcessedSeq: this.lastProcessedSeq,
            ammo: this.ammo,
            maxAmmo: this.maxAmmo,
            reloading: this.reloading,
            dashTimer: this.dashTimer,
            dashCooldown: this.dashCooldown,
            dashDx: this.dashDx,
            dashDy: this.dashDy
        };
    }
}
