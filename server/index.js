import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { SERVER_PORT } from '../shared/constants.js';
import { decode, MSG } from '../shared/protocol.js';
import { GameServer } from './GameServer.js';

// ── Сервер комнат ──────────────────────────────────────
const gameServer = new GameServer();

// ── HTTP-сервер (здоровье / статус) ────────────────────
const httpServer = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: gameServer.rooms.size }));
});

// ── WebSocket-сервер ───────────────────────────────────
const wss = new WebSocketServer({ server: httpServer });

let nextId = 1;

wss.on('connection', (ws) => {
    const id = String(nextId++);
    console.log(`[Server] Подключение клиента (id=${id}), ожидание JOIN...`);

    let hasJoined = false;

    // Обработка входящих сообщений
    ws.on('message', (raw) => {
        const msg = decode(raw.toString());
        if (!msg) return;

        if (!hasJoined) {
            if (msg.type === MSG.JOIN) {
                const name = msg.data.name || `Player${id}`;
                const heroType = msg.data.heroType || 'scout';
                gameServer.joinRoom(id, name, ws, heroType);
                hasJoined = true;
            }
            return;
        }

        switch (msg.type) {
            case MSG.INPUT:
                gameServer.handleInput(id, msg.data);
                break;
            default:
                break;
        }
    });

    ws.on('close', () => {
        if (hasJoined) {
            gameServer.removePlayer(id);
        }
        console.log(`[Server] Отключение клиента (id=${id})`);
    });

    ws.on('error', (err) => {
        console.error(`[Server] Ошибка WS (${id}):`, err.message);
    });
});

// ── Запуск ─────────────────────────────────────────────
httpServer.listen(SERVER_PORT, () => {
    console.log(`[Server] 🚀 Запущен на порту ${SERVER_PORT}`);
});
