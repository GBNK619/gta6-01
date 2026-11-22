// input.js — keyboard and mouse state. `keys` is the set of codes currently
// held; `pressed` holds codes that went down this frame (cleared by main.js
// at the end of every update). Mouse position is in canvas pixels.

const keys = new Set();
const pressed = new Set();
const mouse = { x: VIEW_W / 2, y: VIEW_H / 2, down: false, clicked: false };

const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

addEventListener('keydown', (e) => {
  if (GAME_KEYS.includes(e.code)) e.preventDefault();
  if (!keys.has(e.code)) pressed.add(e.code);
  keys.add(e.code);
  AudioSys.unlock();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); mouse.down = false; });

function bindMouse(canvas) {
  const toLocal = (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (VIEW_W / r.width);
    mouse.y = (e.clientY - r.top) * (VIEW_H / r.height);
  };
  canvas.addEventListener('mousemove', toLocal);
  canvas.addEventListener('mousedown', (e) => {
    toLocal(e); mouse.down = true; mouse.clicked = true; AudioSys.unlock();
  });
  addEventListener('mouseup', () => { mouse.down = false; });
}

function moveAxis() {
  let x = 0, y = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
  return { x, y };
}
