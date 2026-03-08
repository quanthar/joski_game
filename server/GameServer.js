import { GameRoom } from './GameRoom.js';
import { MAX_PLAYERS_PER_ROOM } from '../shared/constants.js';
import { encode, MSG } from '../shared/protocol.js';

export class GameServer {
    constructor() {
        this.rooms = new Map();
        this.nextRoomId = 1;
        this.playerToRoom = new Map(); // id -> roomId
    }

    joinRoom(id, name, ws, heroType) {
        let targetRoomId = null;
        for (const [roomId, room] of this.rooms) {
            if (room.clients.size < MAX_PLAYERS_PER_ROOM) {
                targetRoomId = roomId;
                break;
            }
        }

        if (!targetRoomId) {
            targetRoomId = String(this.nextRoomId++);
            const newRoom = new GameRoom();
            this.rooms.set(targetRoomId, newRoom);
            console.log(`[GameServer] Создана новая комната: ${targetRoomId}`);
        }

        const room = this.rooms.get(targetRoomId);
        const player = room.addPlayer(id, name, ws, heroType);
        this.playerToRoom.set(id, targetRoomId);

        // Отправить WELCOME: свой ID + текущие игроки
        ws.send(encode(MSG.WELCOME, {
            id,
            players: room.getPlayersInfo(),
        }));

        console.log(`[GameServer] Игрок ${name} (${id}) добавлен в комнату ${targetRoomId}, всего игроков: ${room.clients.size}`);
        return room;
    }

    removePlayer(id) {
        const roomId = this.playerToRoom.get(id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (room) {
            room.removePlayer(id);
            console.log(`[GameServer] Игрок ${id} удален из комнаты ${roomId}`);

            if (room.clients.size === 0) {
                room.destroy();
                this.rooms.delete(roomId);
                console.log(`[GameServer] Комната ${roomId} удалена (пустая)`);
            }
        }
        this.playerToRoom.delete(id);
    }

    handleInput(id, data) {
        const roomId = this.playerToRoom.get(id);
        if (!roomId) return;
        const room = this.rooms.get(roomId);
        if (room) {
            room.handleInput(id, data);
        }
    }
}
