import { encode, decode, MSG } from '@shared/protocol.js';
import { SERVER_PORT } from '@shared/constants.js';

/**
 * NetClient — WebSocket-обёртка для связи с сервером.
 * Эмитит события через колбэки.
 */
export class NetClient {
    constructor() {
        /** @type {WebSocket | null} */
        this.ws = null;
        this.myId = null;
        this.connected = false;

        /** @type {Map<string, Function[]>} */
        this._handlers = new Map();
    }

    connect(host = location.hostname, port = SERVER_PORT) {
        return new Promise((resolve, reject) => {
            const url = `ws://${host}:${port}`;
            console.log(`[Net] Подключение к ${url}...`);

            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('[Net] WebSocket открыт');
                this.connected = true;
                resolve();
            };

            this.ws.onclose = () => {
                console.log('[Net] Соединение закрыто');
                this.connected = false;
                this._emit('disconnect', {});
            };

            this.ws.onerror = (err) => {
                console.error('[Net] Ошибка:', err);
                reject(err);
            };

            this.ws.onmessage = (event) => {
                const msg = decode(event.data);
                if (!msg) return;

                if (msg.type === MSG.WELCOME) {
                    this.myId = msg.data.id;
                    console.log(`[Net] Мой ID: ${this.myId}`);
                }

                this._emit(msg.type, msg.data);
            };
        });
    }

    /**
     * Отправить INPUT на сервер.
     */
    sendInput(inputData) {
        if (this.ws && this.connected) {
            this.ws.send(encode(MSG.INPUT, inputData));
        }
    }

    /**
     * Отправить JOIN с именем.
     */
    sendJoin(name, heroType) {
        if (this.ws && this.connected) {
            this.ws.send(encode(MSG.JOIN, { name, heroType }));
        }
    }

    /**
     * Подписка на тип сообщения.
     */
    on(type, handler) {
        if (!this._handlers.has(type)) {
            this._handlers.set(type, []);
        }
        this._handlers.get(type).push(handler);
    }

    _emit(type, data) {
        const handlers = this._handlers.get(type);
        if (handlers) {
            for (const h of handlers) h(data);
        }
    }
}
