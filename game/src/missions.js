// missions.js — Marco Vidal's five jobs: a small story chain that teaches
// the city. Pick up, deliver, steal, escape. Each job is a list of steps;
// the HUD shows the current one and the world marks it with a light beam.

const Missions = {
  index: 0,
  active: null,

  DEFS: [
    {
      title: 'First Run for Marco', reward: 150,
      steps: [
        { kind: 'goto', at: 'cafe', text: 'Pick up the package at Café Brisa' },
        { kind: 'goto', at: 'garage', text: 'Deliver the package to the Marina Garage' },
      ],
    },
    {
      title: 'Borrowed Wheels', reward: 250,
      steps: [
        { kind: 'steal', car: 'gt', text: 'Steal the gold Faro Coupe at the North Parking Deck' },
        { kind: 'goto', at: 'garage', inTarget: true, text: 'Bring the coupe to the Marina Garage' },
      ],
    },
    {
      title: 'Hot Tuna Run', reward: 300,
      steps: [
        { kind: 'goto', at: 'docks', text: 'Pick up the crates at Solana Docks' },
        { kind: 'goto', at: 'hotel', time: 100, text: 'Deliver to Palmera Suites — the ice is melting!' },
      ],
    },
    {
      title: 'Cool Down', reward: 400,
      steps: [
        { kind: 'goto', at: 'cafe', text: 'Grab the bag at Café Brisa' },
        { kind: 'goto', at: 'hideout', heat: 3, text: 'The bag is hot — get to the North Parking Deck' },
        { kind: 'escape', text: 'Lose the heat — break their line of sight' },
      ],
    },
    {
      title: 'Harbor Getaway', reward: 750,
      steps: [
        { kind: 'steal', car: 'van', text: 'Steal the SEGUR van at Solana Docks' },
        { kind: 'goto', at: 'pier', inTarget: true, time: 160, text: 'Get the van to Palmera Pier' },
      ],
    },
  ],

  startSpot() {
    if (this.active || this.index >= this.DEFS.length) return null;
    return PLACES.hotel;
  },
  nextTitle() {
    if (this.index >= this.DEFS.length) return '';
    return 'Meet Marco — “' + this.DEFS[this.index].title + '”';
  },
  step() { return this.active ? this.active.def.steps[this.active.stepIdx] : null; },

  startNext() {
    if (this.active || this.index >= this.DEFS.length) return;
    const def = this.DEFS[this.index];
    this.active = { def, stepIdx: 0, targetCar: null, timer: null };
    this.armStep();
    S.banner = { title: def.title.toUpperCase(), sub: 'New job from Marco Vidal', until: S.time + 3.2 };
    AudioSys.pickup();
  },

  armStep() {
    const st = this.step();
    if (!st) return;
    this.active.timer = st.time || null;
    if (st.kind === 'steal' && !this.active.targetCar) {
      if (st.car === 'gt') {
        const car = Cars.make(3, 2052, 966, Math.PI / 2, { color: '#ffd23e', special: 'gt', driver: 'parked' });
        this.active.targetCar = car;
      } else {
        const car = Cars.make(4, 2746, 2318, 0, { color: '#7a8894', special: 'van', driver: 'parked' });
        this.active.targetCar = car;
      }
    }
  },

  onEnterCar(car) {
    const st = this.step();
    if (st && st.kind === 'steal' && car === this.active.targetCar) {
      if (st.car === 'gt') S.heat = Math.max(S.heat, 2);
      else S.heat = Math.max(S.heat, 3);
      this.advance();
    }
  },

  targetPoint() {
    const st = this.step();
    if (!st) return null;
    if (st.kind === 'steal' && this.active.targetCar) {
      return { x: this.active.targetCar.x, y: this.active.targetCar.y, label: 'TARGET CAR' };
    }
    if (st.at) { const p = PLACES[st.at]; return { x: p.x, y: p.y, label: p.name.toUpperCase() }; }
    return null;
  },

  objectiveText() {
    const st = this.step();
    if (!st) return '';
    let t = st.text;
    if (st.inTarget && Player.car !== this.active.targetCar) t += ' (get in the marked vehicle)';
    return t;
  },

  advance() {
    this.active.stepIdx++;
    if (this.active.stepIdx >= this.active.def.steps.length) { this.complete(); return; }
    this.armStep();
    AudioSys.pickup();
  },

  complete() {
    const def = this.active.def;
    S.cash += def.reward;
    S.stats.missionsDone++;
    this.index++;
    this.active = null;
    S.banner = { title: 'JOB COMPLETE', sub: def.title + ' · +$' + def.reward, until: S.time + 3.6 };
    AudioSys.cash();
    SaveSys.write();
  },

  fail(why) {
    S.banner = { title: 'JOB FAILED', sub: why, until: S.time + 3.4 };
    AudioSys.fail();
    if (this.active && this.active.targetCar && this.active.targetCar.driver === 'parked') {
      Cars.remove(this.active.targetCar);
    }
    this.active = null;
  },

  update(dt) {
    if (!this.active) return;
    const st = this.step();
    if (!st) return;
    if (this.active.timer !== null) {
      this.active.timer -= dt;
      if (this.active.timer <= 0) { this.fail('Out of time — Marco is not pleased.'); return; }
    }
    if (st.kind === 'goto') {
      const p = PLACES[st.at];
      const px = Player.car ? Player.car.x : Player.x;
      const py = Player.car ? Player.car.y : Player.y;
      const inPlace = dist2(px, py, p.x, p.y) < 58 * 58;
      const inCar = !st.inTarget || Player.car === this.active.targetCar;
      if (inPlace && inCar) {
        if (st.heat) S.heat = Math.max(S.heat, st.heat);
        this.advance();
      }
    } else if (st.kind === 'escape') {
      if (Police.stars() === 0 && S.unseenFor > 1.5) this.advance();
    }
  },

  drawMarker(ctx, cam, spot, label, color) {
    const x = spot.x - cam.x, y = spot.y - cam.y;
    if (x < -80 || x > VIEW_W + 80 || y < -80 || y > VIEW_H + 80) return;
    const pulse = 1 + Math.sin(S.time * 4) * 0.12;
    const grad = ctx.createLinearGradient(0, y - 190, 0, y);
    grad.addColorStop(0, 'rgba(255,210,63,0)');
    grad.addColorStop(1, color || 'rgba(255,210,63,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 9, y - 190, 18, 190);
    ctx.strokeStyle = color || '#ffd23e';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y, 30 * pulse, 12 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.font = '700 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23e';
    ctx.fillText(label, x, y - 198);
  },

  drawWorldMarkers(ctx, cam) {
    const start = this.startSpot();
    if (start && S.mode === 'play') this.drawMarker(ctx, cam, start, 'MARCO · NEW JOB', 'rgba(80,220,255,0.55)');
    const tp = this.targetPoint();
    if (tp && S.mode === 'play') this.drawMarker(ctx, cam, tp, tp.label);
  },
};
