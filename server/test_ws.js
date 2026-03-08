import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
    console.log('Connected to local server');
    ws.send(JSON.stringify({ t: 'JOIN', d: { name: 'TestBot', heroType: 'scout' } }));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.t === 'SNAPSHOT') {
        const items = msg.d.items;
        console.log('Received SNAPSHOT ticks:', msg.d.tick, 'Items count:', items ? items.length : 0);
        if (items && items.length > 0) {
            console.log('First item:', items[0]);
            process.exit(0);
        }
    }
});

ws.on('error', (err) => {
    console.error('WS Error:', err);
});
