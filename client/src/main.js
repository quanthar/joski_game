import { Game } from './game/Game.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

function loop(timestamp) {
    game.tick(timestamp);
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
console.log('[Client] Shooter client started');
