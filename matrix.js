const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');

const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&';

let columns, drops;

function init() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const fontSize = 14;
  columns = Math.floor(canvas.width / fontSize);
  drops = Array(columns).fill(1);
  ctx.font = fontSize + 'px monospace';
}

function draw() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < drops.length; i++) {
    const char = chars[Math.floor(Math.random() * chars.length)];
    const x = i * 14;
    const y = drops[i] * 14;

    // Head char brighter
    ctx.fillStyle = drops[i] * 14 < 30 ? '#afffbf' : '#00ff41';
    ctx.fillText(char, x, y);

    if (y > canvas.height && Math.random() > 0.975) {
      drops[i] = 0;
    }
    drops[i]++;
  }
}

init();
window.addEventListener('resize', init);
setInterval(draw, 45);
