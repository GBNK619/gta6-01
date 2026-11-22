// vehicles.js — every car in Palmera City: parked cars, traffic, police
// units and the one the player is driving all share this physics and look.
// Simple arcade handling: throttle, steering that bites with speed, and
// circle collision against buildings and other cars.

const Cars = {
  all: [],

  make(modelIdx, x, y, angle, opts) {
    const model = CAR_MODELS[modelIdx];
    const car = {
      x, y, angle, speed: 0, steer: 0,
      model, color: (opts && opts.color) || pick(model.colors),
      w: model.w, l: model.l,
      ai: null,               // null | 'traffic' | 'police'
      driver: (opts && opts.driver) || 'parked',
      special: (opts && opts.special) || null,   // mission tag, e.g. 'gt', 'van'
      health: 100, stunned: 0, honkAt: 0,
      road: null, dir: 1, panic: 0,
    };
    this.all.push(car);
    return car;
  },

  spawnParked() {
    for (const s of City.parkSpots) {
      if (rng() < 0.38) continue;
      const m = randInt(0, CAR_MODELS.length - 1);
      this.make(m, s.x, s.y, s.angle + (rng() < 0.5 ? 0 : Math.PI));
    }
  },

  remove(car) {
    const i = this.all.indexOf(car);
    if (i >= 0) this.all.splice(i, 1);
  },

  // One physics step. throttle -1..1, steer -1..1.
  step(car, dt, throttle, steer) {
    const m = car.model;
    if (car.stunned > 0) { car.stunned -= dt; throttle = 0; }
    if (throttle > 0) car.speed += m.accel * throttle * dt;
    else if (throttle < 0) car.speed += (car.speed > 8 ? -420 : m.accel * 0.55 * throttle) * dt;
    const drag = car.speed * 0.55 * dt;
    car.speed -= drag;
    const ground = City.groundAt(car.x, car.y);
    const topSpeed = m.top * (ground === 'sand' ? 0.45 : ground === 'grass' ? 0.7 : 1);
    car.speed = clamp(car.speed, -m.top * 0.32, topSpeed);
    if (Math.abs(car.speed) < 2 && throttle === 0) car.speed = 0;
    car.steer += ((steer || 0) - car.steer) * Math.min(1, dt * 8);
    if (car.speed !== 0) {
      const turn = car.steer * 2.1 * Math.min(1, Math.abs(car.speed) / 130) * (car.speed < 0 ? -1 : 1);
      car.angle += turn * dt;
    }
    const nx = car.x + Math.sin(car.angle) * car.speed * dt;
    const ny = car.y - Math.cos(car.angle) * car.speed * dt;
    car.x = nx; car.y = ny;
    this.collide(car);
  },

  collide(car) {
    const r = car.w * 0.52;
    const fx = car.x + Math.sin(car.angle) * car.l * 0.27;
    const fy = car.y - Math.cos(car.angle) * car.l * 0.27;
    const bx = car.x - Math.sin(car.angle) * car.l * 0.27;
    const by = car.y + Math.cos(car.angle) * car.l * 0.27;
    for (const pt of [{ x: fx, y: fy }, { x: bx, y: by }]) {
      const before = { x: pt.x, y: pt.y };
      if (City.collideCircle(pt, r)) {
        const dx = pt.x - before.x, dy = pt.y - before.y;
        car.x += dx; car.y += dy;
        if (Math.abs(car.speed) > 90) this.onCrash(car, Math.abs(car.speed));
        car.speed *= -0.25;
      }
    }
    for (const o of this.all) {
      if (o === car) continue;
      const d2 = dist2(car.x, car.y, o.x, o.y);
      const min = (car.l + o.l) * 0.30;
      if (d2 < min * min && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const push = (min - d) / 2;
        const ux = (car.x - o.x) / d, uy = (car.y - o.y) / d;
        car.x += ux * push; car.y += uy * push;
        if (o.driver === 'parked' || o.ai) { o.x -= ux * push; o.y -= uy * push; }
        const impact = Math.abs(car.speed - o.speed);
        if (impact > 110) {
          this.onCrash(car, impact);
          if (o.ai === 'traffic') o.panic = 2.5;
          if (car.driver === 'player' || o.driver === 'player') Police.reportCrime('hit-and-run', car.x, car.y, 0.55);
        }
        car.speed *= 0.55; o.speed *= 0.55;
      }
    }
  },

  onCrash(car, impact) {
    car.health -= impact * 0.06;
    S.shake = Math.min(14, impact * 0.045);
    Particles.burst(car.x, car.y, impact > 200 ? 16 : 8, '#ffd23e');
    AudioSys.crash(impact > 220);
    if (car.driver === 'player') {
      if (impact > 200) Player.hurt(6, car.x, car.y);
      Police.reportCrime('crash', car.x, car.y, 0.3);
    }
  },

  draw(ctx, car, cam) {
    const x = car.x - cam.x, y = car.y - cam.y;
    if (x < -90 || x > VIEW_W + 90 || y < -90 || y > VIEW_H + 90) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(car.angle);
    const w = car.w, l = car.l;
    ctx.fillStyle = 'rgba(20,8,18,0.35)';
    ctx.fillRect(-w / 2 + 4, -l / 2 + 6, w, l);
    // wheels
    ctx.fillStyle = '#14141a';
    const ww = 6, wl = 13;
    for (const [wx, wy] of [[-w / 2 - 2, -l / 4], [w / 2 - 4, -l / 4], [-w / 2 - 2, l / 4], [w / 2 - 4, l / 4]]) {
      ctx.fillRect(wx, wy - wl / 2, ww, wl);
    }
    // body
    ctx.fillStyle = car.color;
    roundRect(ctx, -w / 2, -l / 2, w, l, 8); ctx.fill();
    if (car.ai === 'police') {
      ctx.fillStyle = '#f2f2f2';
      roundRect(ctx, -w / 2, -l * 0.08, w, l * 0.34, 4); ctx.fill();
      ctx.fillStyle = '#1d2733';
      ctx.font = '700 8px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('POLICÍA', 0, l * 0.12);
    }
    if (car.model.name === 'Taxi Ola') {
      ctx.fillStyle = '#20242c'; ctx.fillRect(-7, -l / 2 + 9, 14, 7);
      ctx.fillStyle = '#ffd23e'; ctx.fillRect(-5, -l / 2 + 11, 10, 3);
    }
    if (car.special === 'van') {
      ctx.fillStyle = 'rgba(30,34,40,0.85)';
      roundRect(ctx, -w / 2 + 3, -l / 2 + 3, w - 6, l - 6, 6); ctx.fill();
      ctx.fillStyle = '#c9a227'; ctx.font = '700 8px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('SEGUR', 0, 3);
    }
    if (car.special === 'gt') {
      ctx.fillStyle = '#ffd23e';
      ctx.fillRect(-3, -l / 2, 6, l);
    }
    // cabin + glass
    ctx.fillStyle = '#1c2733';
    roundRect(ctx, -w / 2 + 4, -l * 0.30, w - 8, l * 0.20, 4); ctx.fill();
    ctx.fillStyle = car.color;
    roundRect(ctx, -w / 2 + 4, -l * 0.10, w - 8, l * 0.26, 4); ctx.fill();
    ctx.fillStyle = '#22303e';
    roundRect(ctx, -w / 2 + 4, l * 0.18, w - 8, l * 0.14, 4); ctx.fill();
    // lights
    ctx.fillStyle = '#fff6c9';
    ctx.fillRect(-w / 2 + 3, -l / 2, 6, 3); ctx.fillRect(w / 2 - 9, -l / 2, 6, 3);
    ctx.fillStyle = '#c22e2e';
    ctx.fillRect(-w / 2 + 3, l / 2 - 3, 6, 3); ctx.fillRect(w / 2 - 9, l / 2 - 3, 6, 3);
    if (car.ai === 'police') {
      const phase = Math.floor(S.time * 6) % 2;
      ctx.fillStyle = phase ? '#ff3b30' : '#3b82f6';
      ctx.fillRect(-w / 4 - 4, -4, 8, 8);
      ctx.fillStyle = phase ? '#3b82f6' : '#ff3b30';
      ctx.fillRect(w / 4 - 4, -4, 8, 8);
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = phase ? '#ff3b30' : '#3b82f6';
      ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (car.health < 45) {  // smoke damage tint
      ctx.fillStyle = 'rgba(30,30,30,0.35)';
      roundRect(ctx, -w / 2, -l / 2, w, l * 0.4, 8); ctx.fill();
    }
    ctx.restore();
    // headlight glow at dusk for the player's car and police
    if (car.driver === 'player' || car.ai === 'police') {
      const gx = x + Math.sin(car.angle) * (car.l / 2 + 30);
      const gy = y - Math.cos(car.angle) * (car.l / 2 + 30);
      const g = ctx.createRadialGradient(gx, gy, 4, gx, gy, 62);
      g.addColorStop(0, 'rgba(255,240,180,0.20)');
      g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(gx, gy, 62, 0, Math.PI * 2); ctx.fill();
    }
  },
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
