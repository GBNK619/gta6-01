// police.js — the Palmera Precinct: a wanted system (heat that cools when
// nobody is watching) and patrol cars that hunt the player, ram the car
// and close in for a bust when the player is on foot or boxed in.

const Police = {
  units: [],

  stars() { return S.heat <= 0.01 ? 0 : Math.min(5, Math.ceil(S.heat)); },

  witnessed(x, y) {
    for (const p of Peds.list) if (dist2(p.x, p.y, x, y) < 260 * 260) return true;
    for (const u of this.units) if (dist2(u.x, u.y, x, y) < 820 * 820) return true;
    return false;
  },

  reportCrime(kind, x, y, amount) {
    if (S.mode !== 'play') return;
    const seen = this.witnessed(x, y);
    S.heat = Math.min(5, S.heat + (seen ? amount : amount * 0.3));
    S.stats.crimes++;
    if (amount >= 0.5) Peds.scare(x, y, 210);
  },

  desiredUnits() { return [0, 1, 2, 3, 4, 6][this.stars()]; },

  spawnUnit() {
    const px = Player.x, py = Player.y;
    for (let tries = 0; tries < 14; tries++) {
      const a = randRange(0, Math.PI * 2), d = randRange(640, 820);
      let x = px + Math.cos(a) * d, y = py + Math.sin(a) * d;
      // Snap to the nearest road so units arrive by street, not through walls.
      let best = null, bd = 1e12;
      for (const ax of AVENUES) { const dd = Math.abs(x - ax); if (dd < bd) { bd = dd; best = { x: ax, y }; } }
      for (const sy of STREETS) { const dd = Math.abs(y - sy); if (dd < bd) { bd = dd; best = { x, y: sy }; } }
      if (best) { x = clamp(best.x, 50, SAND_X - 60); y = clamp(best.y, 50, WORLD_H - 50); }
      if (City.inBuilding(x, y, 30) || City.isWater(x, y)) continue;
      const car = Cars.make(1, x, y, randRange(0, Math.PI * 2));
      car.color = '#20242c'; car.ai = 'police'; car.driver = 'police';
      car.stuckFor = 0; car.reverseFor = 0;
      this.units.push(car);
      return car;
    }
    return null;
  },

  nearestDist() {
    let best = null;
    for (const u of this.units) {
      const d = Math.sqrt(dist2(u.x, u.y, Player.x, Player.y));
      if (best === null || d < best) best = d;
    }
    return best;
  },

  playerSeen() {
    for (const u of this.units) {
      if (dist2(u.x, u.y, Player.x, Player.y) < 560 * 560) return true;
    }
    return false;
  },

  update(dt) {
    const stars = this.stars();
    // Eyes on the player?
    if (this.playerSeen()) S.unseenFor = 0; else S.unseenFor += dt;
    if (S.unseenFor > 6 && S.heat > 0) S.heat = Math.max(0, S.heat - dt * 0.10);
    // Keep the fleet at the size the wanted level calls for.
    while (this.units.length < this.desiredUnits()) { if (!this.spawnUnit()) break; }
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      const far = dist2(u.x, u.y, Player.x, Player.y) > 1450 * 1450;
      if ((stars === 0 && far) || u.health <= 5) {
        Cars.remove(u); this.units.splice(i, 1);
      }
    }
    // Hunt.
    const tx = Player.car ? Player.car.x : Player.x;
    const ty = Player.car ? Player.car.y : Player.y;
    const tvx = Player.car ? Math.sin(Player.car.angle) * Player.car.speed : 0;
    const tvy = Player.car ? -Math.cos(Player.car.angle) * Player.car.speed : 0;
    for (const u of this.units) {
      const gx = tx + tvx * 0.45, gy = ty + tvy * 0.45;
      const want = Math.atan2(gx - u.x, -(gy - u.y));
      let diff = want - u.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      let throttle = 1, steer = clamp(diff * 2.4, -1, 1);
      if (Math.abs(diff) > 2.2) throttle = -0.7;               // turn around
      if (u.reverseFor > 0) { u.reverseFor -= dt; throttle = -1; steer = -steer; }
      else if (Math.abs(u.speed) < 10 && throttle > 0) {
        u.stuckFor += dt;
        if (u.stuckFor > 1.4) { u.reverseFor = 0.7; u.stuckFor = 0; }
      } else u.stuckFor = 0;
      Cars.step(u, dt, throttle, steer);
      if (u.speed > 400) u.speed = 400;
    }
    // Bust pressure.
    let pressure = false;
    if (!Player.car) {
      for (const u of this.units) if (dist2(u.x, u.y, Player.x, Player.y) < 66 * 66) pressure = true;
    } else if (Math.abs(Player.car.speed) < 16) {
      let close = 0;
      for (const u of this.units) if (dist2(u.x, u.y, Player.car.x, Player.car.y) < 110 * 110) close++;
      pressure = close >= 2;
    }
    if (pressure && stars > 0) {
      S.bustMeter = Math.min(1, S.bustMeter + dt * 0.5);
      if (S.bustMeter >= 1) onBusted();
    } else {
      S.bustMeter = Math.max(0, S.bustMeter - dt * 0.7);
    }
  },
};
