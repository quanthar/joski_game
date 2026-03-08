/**
 * ObjectPool — универсальный пул объектов для переиспользования.
 */
export class ObjectPool {
    /**
     * @param {Function} factory — функция создания нового объекта
     * @param {Function} reset — функция сброса объекта (obj) => void
     * @param {number} initialSize — начальный размер пула
     */
    constructor(factory, reset, initialSize = 0) {
        this.factory = factory;
        this.reset = reset;

        /** @type {object[]} */
        this._pool = [];

        // Предварительно создать объекты
        for (let i = 0; i < initialSize; i++) {
            this._pool.push(this.factory());
        }
    }

    /**
     * Получить объект из пула (или создать новый).
     */
    acquire() {
        if (this._pool.length > 0) {
            return this._pool.pop();
        }
        return this.factory();
    }

    /**
     * Вернуть объект в пул.
     */
    release(obj) {
        this.reset(obj);
        this._pool.push(obj);
    }

    /**
     * Текущий размер свободных объектов в пуле.
     */
    get freeCount() {
        return this._pool.length;
    }
}
