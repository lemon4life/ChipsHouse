const $ = id => document.getElementById(id);

const viewport = $('viewport');
const world = $('world');
const player = $('player');
const obstaclesLayer = $('obstaclesLayer');
const minimap = $('minimap');
const mobileControls = $('mobileControls');
const centerBtn = $('centerBtn');

const SPEED = 210;
const INTERACTIVE_RADIUS = 30;
const PLAYER_DISPLAY_W = 64;
const MAP_W = world.clientWidth;
const MAP_H = world.clientHeight;

let VIEW_W = viewport.clientWidth;
let VIEW_H = viewport.clientHeight;

const SPRITES = {
  idle: 'assets/idle.gif',
  left: 'assets/moving_left.gif',
  right: 'assets/moving_right.gif',
  up: 'assets/moving_up.gif',
  down: 'assets/moving_down.gif'
};

Object.values(SPRITES).forEach(src => new Image().src = src);

const obstacles = [
  {x:0,y:0,w:1220,h:200},{x:410,y:140,w:220,h:300},{x:0,y:640,w:430,h:110},
  {x:610,y:640,w:430,h:145},{x:0,y:750,w:80,h:50},{x:416,y:640,w:12,h:180},
  {x:608,y:640,w:12,h:180},{x:52,y:200,w:210,h:50},{x:740,y:200,w:250,h:60},
  {x:790,y:230,w:90,h:60},{x:0,y:0,w:30,h:1440},{x:1000,y:0,w:30,h:1440},
  {x:0,y:1440,w:430,h:10},{x:600,y:1440,w:430,h:10},{x:300,y:1100,w:400,h:120}
];

function renderObstacles() {
  obstaclesLayer.innerHTML = obstacles.map(o =>
    `<div class="obstacle" style="left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px"></div>`
  ).join('');
}
renderObstacles();

let px = MAP_W / 2, py = MAP_H;
let currentSprite = SPRITES.idle;
const keys = { ArrowLeft:false, ArrowRight:false, ArrowUp:false, ArrowDown:false };

const setSprite = path => {
  if (path !== currentSprite) {
    currentSprite = path;
    player.src = path;
  }
};

function isColliding(x, y) {
  const halfW = PLAYER_DISPLAY_W / 2;
  const halfH = (player.clientHeight || PLAYER_DISPLAY_W) / 2;
  const left = x - halfW, right = x + halfW, top = y - halfH, bottom = y + halfH;

  return obstacles.some(r => right > r.x && left < r.x + r.w && bottom > r.y && top < r.y + r.h);
}

function updateCameraAndUI() {
  const camX = clamp(px - VIEW_W/2, 0, MAP_W - VIEW_W);
  const camY = clamp(py - VIEW_H/2, 0, MAP_H - VIEW_H);
  world.style.transform = `translate(${-camX}px,${-camY}px)`;

  if (!centerBtn) return;
  const dist = Math.hypot(px - 700, py - 250);
  centerBtn.classList.toggle('hidden', dist > INTERACTIVE_RADIUS);
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const mmCtx = minimap.getContext('2d');
const MM_SCALE = Math.min(minimap.width / MAP_W, minimap.height / MAP_H);

function drawMinimap() {
  mmCtx.clearRect(0,0,minimap.width,minimap.height);
  mmCtx.fillStyle = '#222';
  mmCtx.fillRect(0,0,minimap.width,minimap.height);

  mmCtx.fillStyle = '#b33';
  obstacles.forEach(o => mmCtx.fillRect(o.x*MM_SCALE, o.y*MM_SCALE, o.w*MM_SCALE, o.h*MM_SCALE));

  mmCtx.fillStyle = '#ffd700';
  mmCtx.beginPath();
  mmCtx.arc(px*MM_SCALE, py*MM_SCALE, 4, 0, Math.PI*2);
  mmCtx.fill();
}

function updateSprite(dx, dy) {
  setSprite(
    dy < 0 ? SPRITES.up :
    dx < 0 ? SPRITES.left :
    dx > 0 ? SPRITES.right :
    dy > 0 ? SPRITES.down :
    SPRITES.idle
  );
}

let lastTs = null;
function loop(ts) {
  if(!lastTs) lastTs = ts;
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;

  let dx = (keys.ArrowRight - keys.ArrowLeft) || 0;
  let dy = (keys.ArrowDown - keys.ArrowUp) || 0;
  if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }

  const newX = px + dx * SPEED * dt;
  const newY = py + dy * SPEED * dt;

  if (!isColliding(newX, py)) px = clamp(newX, PLAYER_DISPLAY_W/2, MAP_W - PLAYER_DISPLAY_W/2);
  if (!isColliding(px, newY)) py = clamp(newY, PLAYER_DISPLAY_W/2, MAP_H - PLAYER_DISPLAY_W/2);

  player.style.left = `${px}px`;
  player.style.top = `${py}px`;

  updateSprite(dx, dy);
  updateCameraAndUI();
  drawMinimap();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.addEventListener('keydown', e => {
  if (keys.hasOwnProperty(e.key)) { e.preventDefault(); keys[e.key] = true; }
  if (e.code === 'Space') tryInteract();
});
window.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

function tryInteract() {
  const dist = Math.hypot(px - 690, py - 290);
  if (dist <= INTERACTIVE_RADIUS) window.location.href = 'next.html';
}

centerBtn?.addEventListener('click', tryInteract);

if (mobileControls) {
  const handleDir = (dir, state) => { if (keys.hasOwnProperty(dir)) keys[dir] = state; };
  mobileControls.addEventListener('pointerdown', e => {
    const dir = e.target.dataset.dir;
    if (dir) handleDir(`Arrow${dir[0].toUpperCase()+dir.slice(1)}`, true);
    if (e.target.classList.contains('interact')) tryInteract();
  });
  mobileControls.addEventListener('pointerup', e => {
    const dir = e.target.dataset.dir;
    if (dir) handleDir(`Arrow${dir[0].toUpperCase()+dir.slice(1)}`, false);
  });
  mobileControls.addEventListener('pointercancel', () => {
    Object.keys(keys).forEach(k => keys[k] = false);
  });
}

function detectMobile() {
  const isMobile = window.matchMedia("(max-width:700px)").matches || /Mobi|Android/i.test(navigator.userAgent);
  mobileControls.style.display = isMobile ? 'flex' : 'none';
}
detectMobile();

window.addEventListener('resize', () => {
  VIEW_W = viewport.clientWidth;
  VIEW_H = viewport.clientHeight;
  drawMinimap();
  detectMobile();
});
