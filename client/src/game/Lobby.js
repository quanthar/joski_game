export class Lobby {
    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'lobby';
        this.container.style.cssText = `
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 15, 26, 0.95);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            font-family: monospace;
            color: white;
        `;

        const title = document.createElement('h1');
        title.innerText = '2D MULTIPLAYER SHOOTER';
        title.style.cssText = `
            font-size: 32px;
            margin-bottom: 40px;
            color: #00ff88;
            text-shadow: 0 0 10px rgba(0,255,136,0.5);
        `;

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.placeholder = 'Enter your name';
        this.input.maxLength = 16;
        this.input.style.cssText = `
            padding: 12px 20px;
            font-size: 18px;
            font-family: monospace;
            background: rgba(255,255,255,0.1);
            border: 2px solid #00ff88;
            color: white;
            border-radius: 4px;
            outline: none;
            margin-bottom: 20px;
            text-align: center;
            width: 300px;
        `;

        this.btn = document.createElement('button');
        this.btn.innerText = 'JOIN GAME';
        this.btn.style.cssText = `
            padding: 12px 40px;
            font-size: 18px;
            font-family: monospace;
            font-weight: bold;
            background: #00ff88;
            color: #111;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        `;
        this.btn.onmouseover = () => {
            this.btn.style.transform = 'scale(1.05)';
            this.btn.style.boxShadow = '0 0 15px rgba(0,255,136,0.5)';
        };
        this.btn.onmouseout = () => {
            this.btn.style.transform = 'scale(1)';
            this.btn.style.boxShadow = 'none';
        };

        this.status = document.createElement('div');
        this.status.style.cssText = `
            margin-top: 20px;
            color: #aaa;
            font-size: 14px;
        `;

        this.container.appendChild(title);
        this.container.appendChild(this.input);
        this.container.appendChild(this.btn);
        this.container.appendChild(this.status);

        document.body.appendChild(this.container);
    }

    onJoin(callback) {
        const handler = () => {
            const name = this.input.value.trim() || 'Player';
            callback(name);
        };

        this.btn.addEventListener('click', handler);
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handler();
        });
    }

    setStatus(text) {
        this.status.innerText = text;
    }

    hide() {
        this.container.style.display = 'none';
    }

    show() {
        this.container.style.display = 'flex';
    }
}
