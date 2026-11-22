// main.js — boots Palmera Heat, owns the loop and the camera, and runs the
// night's flow: menu → play → (pause | wasted | busted) → play again.
// Particles and skid marks live here too; every other file is a system.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
bindMouse(canvas);

const Particles = {
  list: [], skids: [],
  burst(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = randRange(0, Math.PI * 2), sp = randRange(30, 170);
      this.list.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: randRange(0.25, 0.6), age: 0, color });
    }
  },
  skid(x, y) {
    this.skids.push({ x, y, age: 0 });
    if (this.skids.length > 260) this.skids.shift();
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age += dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.92; p.vy *= 0.92;
      if (p.age >= p.life) this.list.splice(i, 1);
    }
    for (const s of this.skids) s.age += dt;
    this.skids = this.skids.filter((s) => s.age < 7);
  },
  drawSkids(ctx, cam) {
    ctx.fillStyle = 'rgba(18,16,22,0.4)';
    for (const s of this.skids) {
      const x = s.x - cam.x, y = s.y - cam.y;
      if (x < -10 || x > VIEW_W + 10 || y < -10 || y > VIEW_H + 10) continue;
      ctx.globalAlpha = 0.4 * (1 - s.age / 7);
      ctx.fillRect(x - 3, y - 3, 6, 6);
    }
    ctx.globalAlpha = 1;
  },
  draw(ctx, cam) {
    for (const p of this.list) {
      ctx.globalAlpha = 1 - p.age / p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - cam.x - 2, p.y - cam.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
  },
};

function newGame() {
  for (const u of Police.units) Cars.remove(u);
  Police.units.length = 0;
  if (Player.car) { Player.car.driver = 'parked'; Player.car = null; }
  S.cash = 120; S.health = 100; S.heat = 0; S.bustMeter = 0; S.unseenFor = 99;
  S.stats = { crimes: 0, carsStolen: 0, missionsDone: 0 };
  Missions.index = 0; Missions.active = null;
  Player.placeAt(PLACES.hotel.x, PLACES.hotel.y + 26);
  Player.angle = Math.PI;
  SaveSys.clear();
  S.mode = 'play'; S.started = true;
}

function continueGame() {
  const d = SaveSys.read();
  if (!d) { newGame(); return; }
  newGame();
  S.cash = d.cash ?? 120;
  S.stats = d.stats || S.stats;
  Missions.index = clamp(d.missionIndex || 0, 0, Missions.DEFS.length);
  if (typeof d.x === 'number') Player.placeAt(d.x, d.y);
}

function onWasted() {
  if (S.mode !== 'play') return;
  S.mode = 'wasted';
  AudioSys.fail();
}

function onBusted() {
  if (S.mode !== 'play') return;
  S.mode = 'busted';
  AudioSys.fail();
}

function respawn() {
  const fine = S.mode === 'wasted' ? Math.min(S.cash, 100) : Math.min(S.cash, Math.max(50, Math.round(S.cash * 0.15)));
  S.cash -= fine;
  const spot = S.mode === 'wasted' ? PLACES.hospital : PLACES.precinct;
  if (Player.car) { Player.car.driver = 'parked'; Player.car.speed = 0; }
  Player.placeAt(spot.x, spot.y);
  S.health = 100; S.heat = 0; S.bustMeter = 0; S.unseenFor = 99;
  for (const u of Police.units) Cars.remove(u);
  Police.units.length = 0;
  S.mode = 'play';
  SaveSys.write();
}

function updateMenu(dt) {
  S.menuPan += dt;
  Traffic.update(dt);
  Peds.update(dt);
  Particles.update(dt);
  if (pressed.has('Enter')) { newGame(); return; }
  if (mouse.clicked) {
    for (const r of Hud.menuRects) {
      if (mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h) {
        if (r.id === 'new') newGame();
        else if (r.id === 'continue') continueGame();
        else if (r.id === 'mute') toggleMute();
      }
    }
  }
}

function toggleMute() {
  S.muted = !S.muted;
  AudioSys.setMuted(S.muted);
}

function update(dt) {
  S.time += dt;
  if (pressed.has('KeyM')) toggleMute();
  if (S.mode === 'menu') { updateMenu(dt); return; }
  if (S.mode === 'pause') {
    if (pressed.has('KeyP') || pressed.has('Escape')) S.mode = 'play';
    else if (pressed.has('KeyR')) newGame();
    return;
  }
  if (S.mode === 'wasted' || S.mode === 'busted') {
    Traffic.update(dt); Peds.update(dt); Particles.update(dt);
    if (pressed.has('Enter')) respawn();
    return;
  }
  // mode === 'play'
  if (pressed.has('KeyP') || pressed.has('Escape')) { S.mode = 'pause'; return; }
  Player.update(dt);
  Traffic.update(dt);
  Peds.update(dt);
  Police.update(dt);
  Missions.update(dt);
  SaveSys.update(dt);
  Particles.update(dt);
  AudioSys.update(dt, Player.car ? Player.car.speed : null, Police.nearestDist());
  // Camera: follow with a little velocity lookahead, plus screen shake.
  const tx = Player.x + (Player.car ? Math.sin(Player.car.angle) * Player.car.speed * 0.22 : 0);
  const ty = Player.y + (Player.car ? -Math.cos(Player.car.angle) * Player.car.speed * 0.22 : 0);
  S.camera.x += (clamp(tx - VIEW_W / 2, 0, WORLD_W - VIEW_W) - S.camera.x) * Math.min(1, dt * 5);
  S.camera.y += (clamp(ty - VIEW_H / 2, 0, WORLD_H - VIEW_H) - S.camera.y) * Math.min(1, dt * 5);
  S.shake = Math.max(0, S.shake - dt * 26);
}

function render() {
  let cam = S.camera;
  if (S.mode === 'menu') {
    const cx = 1750 + Math.sin(S.menuPan * 0.07) * 620;
    const cy = 1250 + Math.cos(S.menuPan * 0.05) * 420;
    cam = { x: clamp(cx - VIEW_W / 2, 0, WORLD_W - VIEW_W), y: clamp(cy - VIEW_H / 2, 0, WORLD_H - VIEW_H) };
  }
  const shx = S.shake ? randRange(-S.shake, S.shake) : 0;
  const shy = S.shake ? randRange(-S.shake, S.shake) : 0;
  const view = { x: cam.x + shx, y: cam.y + shy };
  ctx.fillStyle = '#241832';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  City.drawGround(ctx, view);
  Particles.drawSkids(ctx, view);
  Missions.drawWorldMarkers(ctx, view);
  for (const c of Cars.all) Cars.draw(ctx, c, view);
  for (const p of Peds.list) Peds.draw(ctx, p, view);
  Player.draw(ctx, view);
  City.drawBuildings(ctx, view);
  City.drawPalms(ctx, view);
  Particles.draw(ctx, view);
  // Sunset wash + streetlight glow.
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, PALETTE.sunsetTop);
  grad.addColorStop(1, PALETTE.sunsetBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (const l of City.lights) {
    const x = l.x - view.x, y = l.y - view.y;
    if (x < -50 || x > VIEW_W + 50 || y < -50 || y > VIEW_H + 50) continue;
    const g = ctx.createRadialGradient(x, y, 2, x, y, 44);
    g.addColorStop(0, 'rgba(255,214,120,0.20)');
    g.addColorStop(1, 'rgba(255,214,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 44, 0, Math.PI * 2); ctx.fill();
  }
  if (S.mode === 'menu') { Hud.drawMenu(ctx); return; }
  Hud.draw(ctx);
  if (S.mode === 'pause') Hud.drawPause(ctx);
  if (S.mode === 'wasted') Hud.drawEndScreen(ctx, 'wasted');
  if (S.mode === 'busted') Hud.drawEndScreen(ctx, 'busted');
}

// Boot: build the city, fill it with parked cars, and start the loop.
City.build();
Cars.spawnParked();
Player.placeAt(PLACES.hotel.x, PLACES.hotel.y + 26);
S.camera.x = clamp(Player.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
S.camera.y = clamp(Player.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
Shots.init();

let lastTs = 0;
function frame(ts) {
  const dt = Math.min(0.033, lastTs ? (ts - lastTs) / 1000 : 0.016);
  lastTs = ts;
  update(dt);
  render();
  pressed.clear();
  mouse.clicked = false;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
