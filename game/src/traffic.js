// traffic.js — Palmera's everyday drivers. Each traffic car follows a road
// in the right-hand lane, turns at some intersections, brakes for whatever
// is ahead of it and panics briefly after a crash. Cars are kept flowing
// around the player and quietly removed when far away.

const Traffic = {
  TARGET: 13,

  spawnOne(nearX, nearY) {
    // Pick a road point 500–950 px from the player to appear on.
    for (let tries = 0; tries < 12; tries++) {
      const vertical = rng() < 0.55;
      let x, y;
      if (vertical) { x = pick(AVENUES); y = nearY + randRange(-950, 950); }
      else { y = pick(STREETS); x = nearX + randRange(-950, 950); }
      if (x < 60 || x > SAND_X - 40 || y < 60 || y > WORLD_H - 60) continue;
      const d2 = dist2(x, y, nearX, nearY);
      if (d2 < 480 * 480 || d2 > 1000 * 1000) continue;
      if (Cars.all.some((c) => dist2(c.x, c.y, x, y) < 110 * 110)) continue;
      const car = Cars.make(randInt(0, CAR_MODELS.length - 1), x, y, 0);
      car.ai = 'traffic'; car.driver = 'traffic';
      car.road = vertical ? { type: 'v', c: x } : { type: 'h', c: y };
      car.dir = rng() < 0.5 ? 1 : -1;
      this.snapToLane(car);
      return car;
    }
    return null;
  },

  snapToLane(car) {
    if (car.road.type === 'v') {
      car.x = car.road.c + car.dir * 32;
      car.angle = car.dir > 0 ? Math.PI : 0;
    } else {
      car.y = car.road.c + car.dir * 32;
      car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  },

  lanePointAhead(car, ahead) {
    if (car.road.type === 'v') return { x: car.road.c + car.dir * 32, y: car.y + car.dir * ahead };
    return { x: car.x + car.dir * ahead, y: car.road.c + car.dir * 32 };
  },

  obstacleAhead(car) {
    const ahead = this.lanePointAhead(car, 74);
    for (const o of Cars.all) {
      if (o === car) continue;
      if (dist2(o.x, o.y, ahead.x, ahead.y) < 46 * 46) return true;
    }
    if (dist2(Player.x, Player.y, ahead.x, ahead.y) < 42 * 42 && !Player.car) return true;
    if (Player.car && dist2(Player.car.x, Player.car.y, ahead.x, ahead.y) < 48 * 48) return true;
    for (const p of Peds.list) {
      if (p.state !== 'down' && dist2(p.x, p.y, ahead.x, ahead.y) < 30 * 30) return true;
    }
    return false;
  },

  update(dt) {
    const px = Player.x, py = Player.y;
    let count = 0;
    for (let i = Cars.all.length - 1; i >= 0; i--) {
      const car = Cars.all[i];
      if (car.ai !== 'traffic') continue;
      count++;
      if (dist2(car.x, car.y, px, py) > 1500 * 1500) { Cars.remove(car); count--; continue; }
      if (car.panic > 0) {
        car.panic -= dt;
        Cars.step(car, dt, 0, 0);
        continue;
      }
      // Turn at intersections sometimes.
      const cross = car.road.type === 'v' ? STREETS : AVENUES;
      const along = car.road.type === 'v' ? car.y : car.x;
      for (const c of cross) {
        if (Math.abs(along - c) < 8 && rng() < 0.30) {
          car.road = car.road.type === 'v' ? { type: 'h', c } : { type: 'v', c };
          if (rng() < 0.5) car.dir = -car.dir;
          break;
        }
      }
      const target = this.lanePointAhead(car, 120);
      const want = Math.atan2(target.x - car.x, -(target.y - car.y));
      let diff = want - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = clamp(diff * 2.2, -1, 1);
      const blocked = this.obstacleAhead(car);
      const throttle = blocked ? (car.speed > 6 ? -1 : 0) : 0.55;
      Cars.step(car, dt, throttle, steer);
      if (car.speed > 175) car.speed = 175;
    }
    if (count < this.TARGET && rng() < dt * 2.2) this.spawnOne(px, py);
  },
};
