// pedestrians.js — the people of Palmera City. They stroll the sidewalks
// around a home block, chat in pairs sometimes, run screaming from danger,
// and get knocked down (never killed) by careless driving.

const Peds = {
  list: [],
  TARGET: 24,

  spawn(x, y) {
    const ped = {
      x, y, angle: randRange(0, Math.PI * 2),
      speed: 0, walkPhase: randRange(0, 6),
      shirt: pick(PED_SHIRTS), pants: pick(PED_PANTS), skin: pick(['#f2c79b', '#c98d5e', '#8a5a34', '#6e4525']),
      state: 'walk', timer: randRange(1, 4),
      tx: x, ty: y, downFor: 0,
    };
    this.list.push(ped);
    return ped;
  },

  sidewalkPointNear(x, y) {
    // A point on a block border near (x, y): sidewalks are where peds live.
    const blockXs = [384, 896, 1408, 1920, 2432], blockYs = [384, 896, 1408, 1920];
    const bx = blockXs.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a);
    const by = blockYs.reduce((a, b) => Math.abs(b - y) < Math.abs(a - y) ? b : a);
    const side = randInt(0, 3);
    const t = randRange(10, 374);
    if (side === 0) return { x: bx + t, y: by + 8 };
    if (side === 1) return { x: bx + t, y: by + 376 };
    if (side === 2) return { x: bx + 8, y: by + t };
    return { x: bx + 376, y: by + t };
  },

  scare(x, y, r) {
    for (const p of this.list) {
      if (p.state === 'down') continue;
      if (dist2(p.x, p.y, x, y) < r * r) {
        p.state = 'flee'; p.timer = randRange(1.6, 3);
        p.fleeFrom = { x, y };
      }
    }
  },

  knockDown(p, byCar) {
    if (p.state === 'down') return;
    p.state = 'down'; p.downFor = randRange(3.5, 6);
    Particles.burst(p.x, p.y, 6, '#e8e4da');
    if (byCar) Police.reportCrime('hit pedestrian', p.x, p.y, 0.9);
    this.scare(p.x, p.y, 190);
  },

  update(dt) {
    const px = Player.x, py = Player.y;
    let near = 0;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      const d2 = dist2(p.x, p.y, px, py);
      if (d2 > 1600 * 1600) { this.list.splice(i, 1); continue; }
      if (d2 < 1100 * 1100) near++;
      if (p.state === 'down') {
        p.downFor -= dt;
        if (p.downFor <= 0) { p.state = 'flee'; p.timer = 1.6; p.fleeFrom = { x: px, y: py }; }
        continue;
      }
      let wantSpeed = 52;
      if (p.state === 'flee') {
        wantSpeed = 168;
        p.timer -= dt;
        const away = Math.atan2(p.x - p.fleeFrom.x, -(p.y - p.fleeFrom.y));
        p.tx = p.x + Math.sin(away) * 120;
        p.ty = p.y - Math.cos(away) * 120;
        if (p.timer <= 0) { p.state = 'walk'; const t = this.sidewalkPointNear(p.x, p.y); p.tx = t.x; p.ty = t.y; }
      } else {
        if (dist2(p.x, p.y, p.tx, p.ty) < 18 * 18 || p.timer <= 0) {
          const t = this.sidewalkPointNear(p.x, p.y);
          p.tx = t.x; p.ty = t.y; p.timer = randRange(6, 14);
        }
        p.timer -= dt;
      }
      const want = Math.atan2(p.tx - p.x, -(p.ty - p.y));
      let diff = want - p.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.angle += clamp(diff, -4 * dt, 4 * dt);
      p.speed += (wantSpeed - p.speed) * Math.min(1, dt * 5);
      p.x += Math.sin(p.angle) * p.speed * dt;
      p.y -= Math.cos(p.angle) * p.speed * dt;
      p.walkPhase += dt * (p.speed / 9);
      City.collideCircle(p, 10);
      // Cars knock peds down.
      for (const c of Cars.all) {
        if (Math.abs(c.speed) > 60 && dist2(p.x, p.y, c.x, c.y) < 30 * 30) {
          this.knockDown(p, c.driver === 'player' || c.ai === 'traffic');
          if (c.driver === 'player') Player.hurt(0, p.x, p.y);
          break;
        }
      }
    }
    if (near < this.TARGET && rng() < dt * 3) {
      const a = randRange(0, Math.PI * 2), d = randRange(620, 980);
      const t = this.sidewalkPointNear(px + Math.cos(a) * d, py + Math.sin(a) * d);
      if (!City.inBuilding(t.x, t.y, 4)) this.spawn(t.x, t.y);
    }
  },

  draw(ctx, p, cam) {
    const x = p.x - cam.x, y = p.y - cam.y;
    if (x < -30 || x > VIEW_W + 30 || y < -30 || y > VIEW_H + 30) return;
    ctx.fillStyle = 'rgba(20,8,18,0.30)';
    ctx.beginPath(); ctx.ellipse(x, y + 8, 8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(x, y);
    if (p.state === 'down') ctx.rotate(Math.PI / 2.2);
    const step = Math.sin(p.walkPhase) * (p.state === 'down' ? 0 : 4);
    ctx.strokeStyle = p.pants; ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(0, 2); ctx.lineTo(-3 + step * 0.5, 9);
    ctx.moveTo(0, 2); ctx.lineTo(3 - step * 0.5, 9);
    ctx.stroke();
    ctx.fillStyle = p.shirt;
    roundRect(ctx, -5, -5, 10, 9, 3); ctx.fill();
    ctx.fillStyle = p.skin;
    ctx.beginPath(); ctx.arc(0, -8, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (p.state === 'flee') {
      ctx.fillStyle = '#fff';
      ctx.font = '700 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('!', x, y - 18);
    }
  },
};
