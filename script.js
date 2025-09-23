/* Main game script:
   - World + camera
   - Player movement (GIF switches only when direction changes)
   - Single idle GIF when no keys pressed
   - Collision with rectangular obstacles
   - Minimap
   - Mobile controls
   - Space interaction when near center navigates to next.html
   - CENTER interact button appears when near center and is clickable
*/

// Elements
const viewport = document.getElementById('viewport');
const world = document.getElementById('world');
const player = document.getElementById('player');
const obstaclesLayer = document.getElementById('obstaclesLayer');
const minimap = document.getElementById('minimap');
const mobileControls = document.getElementById('mobileControls');
const mobileInteract = document.getElementById('mobileInteract');
const centerBtn = document.getElementById('centerBtn'); // <-- new

// CONFIG - tune these values
const SPEED = 210; // pixels per second
const INTERACTIVE_RADIUS = 30; // px to center to allow interaction
const PLAYER_DISPLAY_W = 64; // should match CSS width
const MAP_W = world.clientWidth;
const MAP_H = world.clientHeight;
let VIEW_W = viewport.clientWidth;
let VIEW_H = viewport.clientHeight;
let view_h = world.clientHeight;
let view_w = world.clientWidth;

// Sprites - change file names to match your assets
const SPRITES = {
  idle: 'assets/idle.gif',
  left: 'assets/moving_left.gif',
  right: 'assets/moving_right.gif',
  up: 'assets/moving_up.gif',
  down: 'assets/moving_down.gif',
  upLeft: 'assets/moving_left.gif',       // optional
  upRight: 'assets/moving_right.gif',     // optional
  downLeft: 'assets/moving_left.gif',   // optional
  downRight: 'assets/moving_right.gif'  // optional
};

// Preload existing sprite files (skip if not found)
Object.values(SPRITES).forEach(p => {
  const img = new Image();
  img.src = p;
});

// Obstacles (world coordinates). You can change these rectangles to fit your room.
// Format: {x, y, w, h}
const obstacles = [
  {x: 0, y: 0, w: 1220, h: 200},
  {x: 410, y: 140, w: 220, h: 300}, 
  {x: 0, y: 640, w:430, h: 110},
  {x: 610, y: 640, w:430, h: 145},
  {x: 0, y: 750, w:80, h: 50},
  {x: 416, y:640, w:12, h: 180},
  {x: 608, y:640, w:12, h: 180},
  {x: 52, y:200, w:210, h: 50},
  {x: 740, y:200, w:250, h: 60},
  {x: 790, y:230, w:90, h: 60},
  {x:0, y: 0, w:30, h:1440},
  {x:1000, y: 0, w:30, h:1440},
  {x:0, y: 1440, w:430, h:10},
  {x:600, y: 1440, w:430, h:10},
  {x:300, y: 1100, w:400, h:120},
   // couch like obstacle
  // {x: 1200, y: 220, w: 200, h: 120}, // table
  // {x: 1600, y: 800, w: 300, h: 300}  // large furniture
];

// Draw obstacle divs (debug/visual)
function renderObstacleDivs() {
  obstaclesLayer.innerHTML = '';
  for (let o of obstacles) {
    const d = document.createElement('div');
    d.className = 'obstacle';
    d.style.left = `${o.x}px`;
    d.style.top  = `${o.y}px`;
    d.style.width = `${o.w}px`;
    d.style.height = `${o.h}px`;
    obstaclesLayer.appendChild(d);
  }
}
renderObstacleDivs();

// Player world position (center coords)
let px = MAP_W / 2;
let py = MAP_H ;

// Movement state
const keys = { ArrowLeft:false, ArrowRight:false, ArrowUp:false, ArrowDown:false };
let currentSprite = SPRITES.idle; // to avoid resetting gif unless changed

// Helper: set sprite only when changed (prevents restarting the GIF)
function setSprite(path) {
  if (path === currentSprite) return;
  currentSprite = path;
  player.src = path;
}

// Collision detection: axis-aligned box collision for player's bounding box
function isColliding(pxCandidate, pyCandidate) {
  const halfW = PLAYER_DISPLAY_W / 2;
  const halfH = (player.clientHeight || PLAYER_DISPLAY_W) / 2;

  const left = pxCandidate - halfW;
  const top = pyCandidate - halfH;
  const right = pxCandidate + halfW;
  const bottom = pyCandidate + halfH;

  for (let r of obstacles) {
    if (right > r.x && left < r.x + r.w && bottom > r.y && top < r.y + r.h) {
      return true;
    }
  }
  return false;
}

// Camera update: translate world so player is centered when possible
function updateCameraAndCenterUI() {
  const camX = clamp(px - VIEW_W/2, 0, MAP_W - VIEW_W);
  const camY = clamp(py - VIEW_H/2, 0, MAP_H - VIEW_H);
  world.style.transform = `translate(${-camX}px, ${-camY}px)`;

  // show/hide center button based on distance to viewport center
  if (centerBtn) {
    const viewCenterX = 700;
    const viewCenterY = 250;
    const dist = Math.hypot(px - viewCenterX, py - viewCenterY);
    if (dist <= INTERACTIVE_RADIUS) centerBtn.classList.remove('hidden');
    else centerBtn.classList.add('hidden');
  }
}

// Clamp helper
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

// Minimap drawing
const mmCtx = minimap.getContext('2d');
const MM_SCALE = Math.min(minimap.width / MAP_W, minimap.height / MAP_H);

function drawMinimap() {
  // mmCtx.clearRect(0,0,minimap.width,minimap.height);
  // // background
  // mmCtx.fillStyle = '#222';
  // mmCtx.fillRect(0,0,minimap.width,minimap.height);

  // obstacles
  // mmCtx.fillStyle = '#b33';
  // for (let o of obstacles) {
  //   mmCtx.fillRect(o.x * MM_SCALE, o.y * MM_SCALE, o.w*MM_SCALE, o.h*MM_SCALE);
  // }

  // player
  // mmCtx.fillStyle = '#ffd700';
  mmCtx.beginPath();
  // mmCtx.arc(px * MM_SCALE, py * MM_SCALE, 4, 0, Math.PI*2);
  mmCtx.fill();
}

// Update player sprite depending on dx/dy
function updateSpriteForDirection(dx, dy) {
  // diagonal priority first
  if (dx < 0 && dy < 0 && SPRITES.upLeft) { setSprite(SPRITES.upLeft); return; }
  if (dx > 0 && dy < 0 && SPRITES.upRight) { setSprite(SPRITES.upRight); return; }
  if (dx < 0 && dy > 0 && SPRITES.downLeft) { setSprite(SPRITES.downLeft); return; }
  if (dx > 0 && dy > 0 && SPRITES.downRight) { setSprite(SPRITES.downRight); return; }

  // cardinal
  if (dx < 0) setSprite(SPRITES.left);
  else if (dx > 0) setSprite(SPRITES.right);
  else if (dy < 0) setSprite(SPRITES.up);
  else if (dy > 0) setSprite(SPRITES.down);
  else setSprite(SPRITES.idle);
}

// Movement & loop
let lastTs = null;
function loop(ts) {
  if(!lastTs) lastTs = ts;
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;

  // compute direction
  let dx = 0, dy = 0;
  if (keys.ArrowLeft) dx -= 1;
  if (keys.ArrowRight) dx += 1;
  if (keys.ArrowUp) dy -= 1;
  if (keys.ArrowDown) dy += 1;

  // normalize diagonal
  if (dx !== 0 && dy !== 0) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }

  // If moving, attempt new positions with collision checking separately per axis
  let newX = px + dx * SPEED * dt;
  let newY = py + dy * SPEED * dt;

  // check X move
   if (!isColliding(newX, py)) 
    px = clamp(newX, PLAYER_DISPLAY_W/2, MAP_W - PLAYER_DISPLAY_W/2);
  // check Y move
   if (!isColliding(px, newY)) 
    py = clamp(newY, PLAYER_DISPLAY_W/2, MAP_H - PLAYER_DISPLAY_W/2);

  // Position player (player image is centered by transform)
  player.style.left = `${px}px`;
  player.style.top = `${py}px`;

  // Sprite switching: only change when direction state changes (setSprite handles no-op)
  updateSpriteForDirection(dx, dy);

  // Camera + center button
  updateCameraAndCenterUI();

  // Minimap
  drawMinimap();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// KEYBOARD handling (prevent arrow keys from scrolling)
window.addEventListener('keydown', (e) => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
    e.preventDefault();
    keys[e.key] = true;
  }

  // Interaction (Space) only works when near center of viewport
  if (e.code === 'Space') {
    tryInteract();
  }
});

window.addEventListener('keyup', (e) => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
    keys[e.key] = false;
  }
});

// Interaction: when player center is near viewport center, go to next.html
function tryInteract() {
  // compute viewport center in world coords
  const camX = clamp(px - view_h/2, 0, MAP_W - view_w);
  const camY = clamp(py - view_h/2, 0, MAP_H - view_w);
  // const viewCenterX = camX + view_w/2;
  // const viewCenterY = camY + view_h/2;
  const viewCenterX = 690;
    const viewCenterY = 290;
  const dist = Math.hypot(px - viewCenterX, py - viewCenterY);
  //  const dist = Math.hypot(px - 0, py - 0);
  if (dist <= INTERACTIVE_RADIUS) {
    // navigate to next scene
    window.location.href = 'next.html';
  } else {
    // optional: flash or show tooltip
  }
}

// CENTER button click triggers interact
if (centerBtn) {
  centerBtn.addEventListener('click', () => {
    tryInteract();
  });
}

// MOBILE controls: touchstart/touchend map to keys
if (mobileControls) {
  mobileControls.addEventListener('pointerdown', (ev) => {
    const dir = ev.target.dataset.dir;
    if (dir) {
      if (dir === 'left') keys.ArrowLeft = true;
      if (dir === 'right') keys.ArrowRight = true;
      if (dir === 'up') keys.ArrowUp = true;
      if (dir === 'down') keys.ArrowDown = true;
    }
    if (ev.target.classList.contains('interact')) tryInteract();
  });
  mobileControls.addEventListener('pointerup', (ev) => {
    const dir = ev.target.dataset.dir;
    if (dir) {
      if (dir === 'left') keys.ArrowLeft = false;
      if (dir === 'right') keys.ArrowRight = false;
      if (dir === 'up') keys.ArrowUp = false;
      if (dir === 'down') keys.ArrowDown = false;
    }
  });
  // also cancel on pointercancel / leave
  mobileControls.addEventListener('pointercancel', (ev) => {
    keys.ArrowLeft = keys.ArrowRight = keys.ArrowUp = keys.ArrowDown = false;
  });
}

// Detect mobile and show controls
function detectMobile() {
  const isMobile = window.matchMedia("(max-width:700px)").matches || /Mobi|Android/i.test(navigator.userAgent);
  if (isMobile) mobileControls.style.display = 'flex';
  else mobileControls.style.display = 'none';
}
detectMobile();
window.addEventListener('resize', () => {
  VIEW_W = viewport.clientWidth;
  VIEW_H = viewport.clientHeight;
  drawMinimap();
  detectMobile();
});
