/**
 * Расстояние между двумя точками.
 */
export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Квадрат расстояния (дешевле, когда не нужен точный результат).
 */
export function distanceSq(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
}

/**
 * Нормализация вектора. Возвращает { x, y } единичной длины.
 * Если вектор нулевой — возвращает { x: 0, y: 0 }.
 */
export function normalize(x, y) {
    const len = Math.sqrt(x * x + y * y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
}

/**
 * Линейная интерполяция от a до b по коэффициенту t ∈ [0, 1].
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Ограничение значения в диапазоне [min, max].
 */
export function clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

/**
 * Угол от точки (x1,y1) к (x2,y2) в радианах.
 */
export function angleTo(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Интерполяция угла (корректно обрабатывает переход через ±π).
 */
export function lerpAngle(a, b, t) {
    let diff = b - a;
    // Нормализация в [-π, π]
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return a + diff * t;
}
