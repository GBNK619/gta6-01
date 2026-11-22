// player.js — you: a small-time runner in a teal shirt. On foot you walk,
// run and throw punches; any car in Palmera City can be yours with the E
// key; the hospital and the precinct are where bad days end.

const Player = {
  x: PLACES.hotel.x, y: PLACES.hotel.y + 26,
  angle: Math.PI, speed: 0, walkPhase: 0,
  car: null, punchCd: 0, punchAt: -9, stumble: 0,

  placeAt(x, y) {
    this.x = x; this.y = y;
    if (this.car) { this.car.driver = 'parked'; this.car = null; }
  },

  hurt(dmg, fromX, fromY) {
    if (dmg <= 0 || S.mode !== 'play') return;
    S.health -= dmg;
    S.hurtAt = S.time;
    if (S.health <= 0) { S.health = 0; onWasted(); }
  },

  nearestCar(maxD) {
    let best = null, bd = maxD * maxD;
    for (const c of Cars.all) {
      if (c.driver === 'player') continue;
      const d = dist2(c.x, c.y, this.x, this.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  },

  enterCar(car) {
    const wasTraffic = car.ai === 'traffic';
    const wasParked = car.driver === 'parked';
    if (wasTraffic || wasParked) {
      S.stats.carsStolen++;
      Police.reportCrime('car theft', car.x, car.y, wasTraffic ? 0.9 : 0.65);
      Peds.scare(car.x, car.y, 130);
    }
    car.ai = null; car.driver = 'player';
    this.car = car;
    AudioSys.door();
    Missions.onEnterCar(car);
  },

  exitCar() {
    const car = this.car;
    if (!car) return;
    car.driver = 'parked'; car.speed = 0;
    this.x = car.x + Math.cos(car.angle) * (car.w / 2 + 16);
    this.y = car.y + Math.sin(car.angle) * (car.w / 2 + 16);
    City.collideCircle(this, 13);
    this.car = null;
    AudioSys.door();
  },

  punch() {
    if (this.punchCd > 0 || this.car) return;
    this.punchCd = 0.34; this.punchAt = S.time;
    const aim = Math.atan2(mouse.x - VIEW_W / 2, -(mouse.y - VIEW_H / 2));
    if (Math.abs(mouse.x - VIEW_W / 2) + Math.abs(mouse.y - VIEW_H / 2) > 24) this.angle = aim;
    AudioSys.punch();
    const hx = this.x + Math.sin(this.angle) * 40, hy = this.y - Math.cos(this.angle) * 40;
    let hitSomething = false;
    for (const p of Peds.list) {
      if (p.state !== 'down' && dist2(p.x, p.y, hx, hy) < 30 * 30) {
        Peds.knockDown(p, false);
        Police.reportCrime('assault', this.x, this.y, 0.8);
        hitSomething = true;
      }
    }
    for (const c of Cars.all) {
      if (dist2(c.x, c.y, hx, hy) < 40 * 40) {
        Particles.burst(hx, hy, 5, '#ffd23e');
        Police.reportCrime('vandalism', this.x, this.y, 0.25);
        hitSomething = true;
      }
    }
    if (hitSomething) S.shake = Math.max(S.shake, 2);
  },

  update(dt) {
    this.punchCd = Math.max(0, this.punchCd - dt);
    if (this.stumble > 0) this.stumble -= dt;
    // Health creeps back when nobody has hurt you for a while.
    if (S.time - S.hurtAt > 5 && S.health > 0) S.health = Math.min(100, S.health + 2.4 * dt);
    S.prompt = '';

    if (this.car) {
      const car = this.car;
      let throttle = 0, steer = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) throttle = 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) throttle = -1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) steer = -1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) steer = 1;
      if (keys.has('Space')) car.speed -= car.speed * 3.2 * dt;   // handbrake
      Cars.step(car, dt, throttle, steer);
      this.x = car.x; this.y = car.y; this.angle = car.angle;
      if (Math.abs(car.speed) > 200 && rng() < dt * 9) {
        Particles.skid((car.x - Math.sin(car.angle) * car.l * 0.3), (car.y + Math.cos(car.angle) * car.l * 0.3));
      }
      if (pressed.has('KeyE')) { this.exitCar(); return; }
      S.prompt = 'E — step out · Space — handbrake';
      return;
    }

    // On foot.
    const ax = moveAxis();
    const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const spd = (running ? 218 : 124) * (this.stumble > 0 ? 0.4 : 1);
    if (ax.x !== 0 || ax.y !== 0) {
      const len = Math.hypot(ax.x, ax.y);
      const want = Math.atan2(ax.x / len, -(ax.y / len));
      let diff = want - this.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.angle += clamp(diff, -11 * dt, 11 * dt);
      this.x += Math.sin(this.angle) * spd * dt;
      this.y -= Math.cos(this.angle) * spd * dt;
      this.speed = spd;
      this.walkPhase += dt * spd / 8;
    } else this.speed = 0;
    City.collideCircle(this, 13);
    // Traffic can run you down.
    for (const c of Cars.all) {
      if (Math.abs(c.speed) > 100 && dist2(this.x, this.y, c.x, c.y) < 30 * 30 && this.stumble <= 0) {
        this.stumble = 0.9;
        this.hurt(9, c.x, c.y);
        this.x += (this.x - c.x) * 0.4; this.y += (this.y - c.y) * 0.4;
        S.shake = Math.max(S.shake, 6);
        AudioSys.crash(false);
      }
    }
    if (pressed.has('KeyF') || mouse.clicked) this.punch();

    const near = this.nearestCar(64);
    const missionSpot = Missions.startSpot();
    if (missionSpot && dist2(this.x, this.y, missionSpot.x, missionSpot.y) < 52 * 52 && !Missions.active) {
      S.prompt = 'E — ' + Missions.nextTitle();
      if (pressed.has('KeyE')) { Missions.startNext(); return; }
    } else if (near) {
      S.prompt = 'E — steal the ' + near.model.name;
      if (pressed.has('KeyE')) { this.enterCar(near); return; }
    }
  },

  draw(ctx, cam) {
    if (this.car) return;
    const x = this.x - cam.x, y = this.y - cam.y;
    ctx.fillStyle = 'rgba(20,8,18,0.35)';
    ctx.beginPath(); ctx.ellipse(x, y + 9, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    const step = Math.sin(this.walkPhase) * (this.speed > 10 ? 4.5 : 0);
    ctx.strokeStyle = '#26303e'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y + 2); ctx.lineTo(x - 3 + step * 0.5, y + 10);
    ctx.moveTo(x, y + 2); ctx.lineTo(x + 3 - step * 0.5, y + 10);
    ctx.stroke();
    ctx.fillStyle = '#12b5a5';
    roundRect(ctx, x - 6, y - 6, 12, 10, 3.5); ctx.fill();
    // Facing tick + head.
    ctx.strokeStyle = '#12b5a5'; ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(this.angle) * 11, y - Math.cos(this.angle) * 11);
    ctx.stroke();
    ctx.fillStyle = '#e8b08a';
    ctx.beginPath(); ctx.arc(x, y - 2, 5, 0, Math.PI * 2); ctx.fill();
    // Punch arm mid-swing.
    if (this.punchCd > 0.18) {
      ctx.strokeStyle = '#e8b08a'; ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.sin(this.angle) * 24, y - Math.cos(this.angle) * 24);
      ctx.stroke();
    }
    if (S.bustMeter > 0.02) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x - 22, y - 30, 44, 7);
      ctx.fillStyle = '#ff3b30';
      ctx.fillRect(x - 21, y - 29, 42 * S.bustMeter, 5);
    }
  },
};
