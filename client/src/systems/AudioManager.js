/**
 * AudioManager — синтез звуков через Web Audio API. 
 */
export class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = false;

        window.addEventListener('mousedown', () => this.resume(), { once: true });
    }

    resume() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.enabled = true;
    }

    /**
     * Реалистичный звук выстрела из пистолета.
     * Комбинирует взрывной белый шум и низкочастотный "удар".
     */
    playShoot() {
        if (!this.enabled) return;

        const { ctx } = this;
        const now = ctx.currentTime;

        // 1. Механический клик (высокий щелчок)
        this._playTone(800, 0.01, 'square', 0.05);

        // 2. Взрыв газа (белый шум с быстрым спадом)
        const dur = 0.25;
        const bufferSize = ctx.sampleRate * dur;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        // Фильтр для "пистолетного" тембра (отсекаем слишком высокие частоты)
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, now);
        filter.frequency.exponentialRampToValueAtTime(800, now + dur);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.15, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);

        // 3. Низкочастотный "пинок" (басовый синус)
        const kick = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(150, now);
        kick.frequency.exponentialRampToValueAtTime(40, now + 0.1);

        kickGain.gain.setValueAtTime(0.12, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        kick.connect(kickGain);
        kickGain.connect(ctx.destination);
        kick.start(now);
        kick.stop(now + 0.15);
    }

    playHit() {
        if (!this.enabled) return;
        this._playTone(400, 0.03, 'square', 0.05);
    }

    playDeath() {
        if (!this.enabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    _playTone(freq, dur, type = 'sine', vol = 0.1) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + dur);
    }
}
