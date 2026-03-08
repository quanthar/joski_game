/**
 * InputManager — абстракция ввода: WASD → движение, мышь → прицеливание.
 * Хранит текущее состояние нажатых клавиш и позицию мыши.
 */
export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;

        // Клавиши (состояние: зажата или нет)
        this.keys = new Set();

        // Позиция мыши на экране (в пикселях canvas)
        this.mouseX = 0;
        this.mouseY = 0;

        // Кнопки мыши
        this.mouseDown = false;
        this.mouseRightDown = false;

        this._bindEvents();
    }

    _bindEvents() {
        window.addEventListener('keydown', (e) => {
            this.keys.add(e.code);
        });
        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
        });
        // При потере фокуса — сбросить все кнопки
        window.addEventListener('blur', () => {
            this.keys.clear();
            this.mouseDown = false;
            this.mouseRightDown = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.mouseDown = true;
            if (e.button === 2) this.mouseRightDown = true;
        });
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouseDown = false;
            if (e.button === 2) this.mouseRightDown = false;
        });
        // Запрет контекстного меню (правой кнопки)
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * Получить вектор движения { dx, dy } нормализованный (или 0,0).
     */
    getMovement() {
        let dx = 0;
        let dy = 0;
        if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dy -= 1;
        if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) dy += 1;
        if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) dx -= 1;
        if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dx += 1;

        // Нормализация диагонального движения
        if (dx !== 0 && dy !== 0) {
            const len = Math.SQRT2;
            dx /= len;
            dy /= len;
        }
        return { dx, dy };
    }

    /**
     * Позиция мыши в мировых координатах (нужна камера).
     */
    getWorldMouse(camera) {
        return {
            x: this.mouseX + camera.x - this.canvas.width / 2,
            y: this.mouseY + camera.y - this.canvas.height / 2,
        };
    }

    /**
     * Нажата ли клавиша перезарядки.
     */
    isReloadPressed() {
        return this.keys.has('KeyR');
    }

    /**
     * Стреляет ли (ЛКМ зажата).
     */
    isShooting() {
        return this.mouseDown;
    }

    isSprinting() {
        return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    }

    isDashing() {
        return this.keys.has('Space');
    }
}
