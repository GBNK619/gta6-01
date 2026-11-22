// city.js — builds Palmera City and draws it: a grid of avenues and streets,
// named buildings in sidewalked blocks, parking lots, Palmera Beach and the
// pier on the east shore. Also answers the world's physics questions:
// what ground is this, is it water, and does a circle hit a building.

const City = {
  buildings: [],   // {x,y,w,h,name,floors,roof}
  palms: [],       // {x,y,s}
  lights: [],      // {x,y} streetlights at intersections
  parkSpots: [],   // {x,y,angle} where parked cars sit
  pierRect: { x: 3100, y: 1306, w: 380, h: 76 },

  build() {
    this.buildings.length = 0; this.palms.length = 0;
    this.lights.length = 0; this.parkSpots.length = 0;
    const blockXs = [384, 896, 1408, 1920, 2432];
    const blockYs = [384, 896, 1408, 1920];
    let nameIdx = 0;
    const nextName = () => BUILDING_NAMES[nameIdx++ % BUILDING_NAMES.length];
    const roofs = [PALETTE.roofA, PALETTE.roofB, PALETTE.roofC, PALETTE.roofD, PALETTE.roofE];

    // Hand-placed landmark blocks (bx, by are block origins).
    const named = {
      '384,1408': { name: 'Palmera Suites', rect: [452, 1472, 264, 224], floors: 9 },
      '896,384': { name: 'Café Brisa', rect: [972, 452, 216, 176], floors: 2 },
      '1408,896': { name: 'Clínica del Mar', rect: [1472, 962, 244, 190], floors: 5 },
      '1920,384': { name: 'Palmera Precinct', rect: [1992, 452, 232, 178], floors: 4 },
      '2432,1920': { name: 'Marina Garage', rect: [2524, 2012, 224, 172], floors: 2 },
    };
    const parkingBlocks = new Set(['1920,896', '384,384', '2432,384']);

    for (const bx of blockXs) for (const by of blockYs) {
      const key = bx + ',' + by;
      if (parkingBlocks.has(key)) { this.makeParking(bx, by); continue; }
      if (named[key]) {
        const n = named[key];
        this.buildings.push({
          x: n.rect[0], y: n.rect[1], w: n.rect[2], h: n.rect[3],
          name: n.name, floors: n.floors, roof: pick(roofs),
        });
        continue;
      }
      this.makeBlockBuildings(bx, by, nextName, roofs);
    }
    // Solana Docks warehouse on the south waterfront strip.
    this.buildings.push({ x: 2600, y: 2450, w: 280, h: 92, name: 'Solana Docks', floors: 1, roof: PALETTE.roofD });

    PLACES.cafe = { x: 940, y: 668, name: 'Café Brisa' };
    PLACES.garage = { x: 2490, y: 2236, name: 'Marina Garage' };
    PLACES.hospital = { x: 1442, y: 1216, name: 'Clínica del Mar' };
    PLACES.precinct = { x: 1962, y: 706, name: 'Palmera Precinct' };
    PLACES.docks = { x: 2740, y: 2406, name: 'Solana Docks' };
    PLACES.hideout = { x: 2112, y: 1088, name: 'North Parking Deck' };
    PLACES.pier = { x: 3330, y: 1344, name: 'Palmera Pier' };

    // Palms: a row along the beach, scattered on the park strips and plazas.
    for (let y = 90; y < WORLD_H - 60; y += randRange(80, 130)) {
      this.palms.push({ x: randRange(3000, 3150), y, s: randRange(0.85, 1.2) });
    }
    for (let i = 0; i < 90; i++) {
      const x = randRange(20, WORLD_W - 380), y = randRange(20, WORLD_H - 20);
      if (this.onRoad(x, y) || this.inBuilding(x, y, 26)) continue;
      this.palms.push({ x, y, s: randRange(0.8, 1.15) });
    }
    // Streetlights on intersection corners.
    for (const ax of AVENUES) for (const sy of STREETS) {
      this.lights.push({ x: ax - 76, y: sy - 76 }, { x: ax + 76, y: sy + 76 });
    }
    // Parked-car spots along the avenue kerbs, clear of the cross streets.
    for (const ax of AVENUES) {
      for (let y = 120; y < WORLD_H - 120; y += randRange(150, 230)) {
        if (STREETS.some((sy) => Math.abs(y - sy) < 110)) continue;
        this.parkSpots.push({ x: ax + pick([-50, 50]), y, angle: Math.PI / 2 });
      }
    }
    for (const sy of STREETS) {
      for (let x = 620; x < SAND_X - 160; x += randRange(170, 260)) {
        if (AVENUES.some((ax) => Math.abs(x - ax) < 110)) continue;
        this.parkSpots.push({ x, y: sy + pick([-50, 50]), angle: 0 });
      }
    }
  },

  makeBlockBuildings(bx, by, nextName, roofs) {
    const style = rng();
    const add = (x, y, w, h) => this.buildings.push({
      x, y, w, h, name: nextName(), floors: randInt(2, 9), roof: pick(roofs),
    });
    if (style < 0.34) {           // one tower with a forecourt
      add(bx + randInt(48, 70), by + randInt(48, 70), randInt(220, 260), randInt(200, 250));
    } else if (style < 0.67) {    // two slabs
      add(bx + 34, by + 40, 150, randInt(160, 300));
      add(bx + 216, by + 40, 134, randInt(160, 300));
    } else {                      // four small blocks
      add(bx + 32, by + 34, 140, 140); add(bx + 204, by + 34, 140, 140);
      add(bx + 32, by + 206, 140, 140); add(bx + 204, by + 206, 140, 140);
    }
  },

  makeParking(bx, by) {
    // An open parking deck: rows of marked bays, most of them filled.
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
      if (rng() < 0.3) continue;
      this.parkSpots.push({ x: bx + 52 + c * 62, y: by + 62 + r * 108, angle: 0 });
    }
  },

  onRoad(x, y) {
    if (x > SAND_X + ROAD_W / 2) return false;
    for (const ax of AVENUES) if (Math.abs(x - ax) <= ROAD_W / 2) return true;
    if (x < SAND_X) for (const sy of STREETS) if (Math.abs(y - sy) <= ROAD_W / 2) return true;
    return false;
  },
  inBuilding(x, y, pad) {
    for (const b of this.buildings) {
      if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return b;
    }
    return null;
  },
  onDeck(x, y) {
    const p = this.pierRect;
    return x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h;
  },
  isWater(x, y) { return x >= WATER_X && !this.onDeck(x, y); },
  groundAt(x, y) {
    if (this.onDeck(x, y)) return 'deck';
    if (x >= WATER_X) return 'water';
    if (x >= SAND_X) return 'sand';
    if (this.onRoad(x, y)) return 'road';
    if (x < 250 || y < 250) return 'grass';
    return 'ground';
  },
  // Push a circle out of every building and the waterline; returns true on hit.
  collideCircle(p, r) {
    let hit = false;
    for (const b of this.buildings) {
      const nx = clamp(p.x, b.x, b.x + b.w), ny = clamp(p.y, b.y, b.y + b.h);
      let dx = p.x - nx, dy = p.y - ny;
      const d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        hit = true;
        if (d2 < 0.001) { p.x = b.x - r; continue; }
        const d = Math.sqrt(d2);
        p.x = nx + (dx / d) * r; p.y = ny + (dy / d) * r;
      }
    }
    if (p.x > WATER_X - r && !this.onDeck(p.x, p.y)) { p.x = WATER_X - r; hit = true; }
    p.x = clamp(p.x, r, WORLD_W - r);
    p.y = clamp(p.y, r, WORLD_H - r);
    return hit;
  },

  drawGround(ctx, cam) {
    const x0 = cam.x, y0 = cam.y, x1 = cam.x + VIEW_W, y1 = cam.y + VIEW_H;
    ctx.fillStyle = PALETTE.concrete;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Park strips on the north and west edges.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(-x0, -y0, 250, WORLD_H);
    ctx.fillRect(-x0, -y0, WORLD_W, 250);
    // Beach and sea.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(SAND_X - x0, -y0, WATER_X - SAND_X, WORLD_H);
    ctx.fillStyle = PALETTE.sandWet;
    ctx.fillRect(WATER_X - 26 - x0, -y0, 26, WORLD_H);
    const grad = ctx.createLinearGradient(WATER_X - x0, 0, VIEW_W, 0);
    grad.addColorStop(0, PALETTE.water); grad.addColorStop(1, PALETTE.waterDeep);
    ctx.fillStyle = grad;
    ctx.fillRect(WATER_X - x0, -y0, WORLD_W - WATER_X + VIEW_W, WORLD_H);
    ctx.strokeStyle = PALETTE.waterFoam;
    ctx.globalAlpha = 0.5; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let y = -((S.time * 22) % 46); y < VIEW_H + 46; y += 46) {
      ctx.moveTo(WATER_X - x0 - 4, y);
      ctx.quadraticCurveTo(WATER_X - x0 + 9, y + 12, WATER_X - x0 - 4, y + 24);
    }
    ctx.stroke(); ctx.globalAlpha = 1;
    // The pier: a wooden deck walking out over the water.
    const p = this.pierRect;
    ctx.fillStyle = '#8a6a44';
    ctx.fillRect(p.x - x0, p.y - y0, p.w, p.h);
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    for (let x = p.x + 16; x < p.x + p.w; x += 32) ctx.fillRect(x - x0, p.y - y0, 3, p.h);
    // Roads.
    ctx.fillStyle = PALETTE.road;
    for (const ax of AVENUES) ctx.fillRect(ax - ROAD_W / 2 - x0, -y0, ROAD_W, WORLD_H);
    for (const sy of STREETS) ctx.fillRect(-x0, sy - ROAD_W / 2 - y0, SAND_X + 64, ROAD_W);
    ctx.fillStyle = PALETTE.roadEdge;
    for (const ax of AVENUES) { ctx.fillRect(ax - ROAD_W / 2 - x0, -y0, 3, WORLD_H); ctx.fillRect(ax + ROAD_W / 2 - 3 - x0, -y0, 3, WORLD_H); }
    for (const sy of STREETS) { ctx.fillRect(-x0, sy - ROAD_W / 2 - y0, SAND_X + 64, 3); ctx.fillRect(-x0, sy + ROAD_W / 2 - 3 - y0, SAND_X + 64, 3); }
    // Lane dashes.
    ctx.fillStyle = PALETTE.lane;
    ctx.globalAlpha = 0.55;
    for (const ax of AVENUES) for (let y = 24; y < WORLD_H; y += 52) ctx.fillRect(ax - 2 - x0, y - y0, 4, 26);
    for (const sy of STREETS) for (let x = 24; x < SAND_X; x += 52) ctx.fillRect(x - x0, sy - 2 - y0, 26, 4);
    ctx.globalAlpha = 1;
    // Block sidewalks, then the block interiors.
    ctx.fillStyle = PALETTE.sidewalk;
    const blockXs = [384, 896, 1408, 1920, 2432], blockYs = [384, 896, 1408, 1920];
    for (const bx of blockXs) for (const by of blockYs) {
      if (bx + 384 < x0 || bx > x1 || by + 384 < y0 || by > y1) continue;
      ctx.fillRect(bx - x0, by - y0, 384, 384);
      ctx.fillStyle = PALETTE.plaza;
      ctx.fillRect(bx + 14 - x0, by + 14 - y0, 356, 356);
      ctx.fillStyle = PALETTE.sidewalk;
    }
    // Streetlight poles (their glow is drawn with the night overlay).
    ctx.fillStyle = '#2c2c34';
    for (const l of this.lights) {
      if (l.x < x0 - 20 || l.x > x1 + 20 || l.y < y0 - 20 || l.y > y1 + 20) continue;
      ctx.fillRect(l.x - 2 - x0, l.y - 2 - y0, 4, 4);
    }
  },

  drawBuildings(ctx, cam) {
    const x0 = cam.x, y0 = cam.y, x1 = cam.x + VIEW_W, y1 = cam.y + VIEW_H;
    for (const b of this.buildings) {
      if (b.x + b.w < x0 || b.x > x1 || b.y + b.h < y0 || b.y > y1) continue;
      const bx = b.x - x0, by = b.y - y0, lift = 4 + b.floors * 2;
      ctx.fillStyle = 'rgba(30,10,24,0.35)';                       // shadow
      ctx.fillRect(bx + 9, by + 13, b.w, b.h);
      ctx.fillStyle = '#5c4653';                                    // wall band
      ctx.fillRect(bx, by, b.w, b.h);
      ctx.fillStyle = b.roof;                                       // roof, lifted north
      ctx.fillRect(bx + 5, by + 5 - lift, b.w - 10, b.h - 10);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(bx + 16, by + 16 - lift, b.w - 32, b.h - 32);
      ctx.fillStyle = 'rgba(0,0,0,0.20)';                           // roof clutter
      const n = 1 + (b.floors % 3);
      for (let i = 0; i < n; i++) {
        const cx = bx + 22 + ((i * 67 + b.floors * 31) % Math.max(24, b.w - 60));
        const cy = by + 22 - lift + ((i * 41 + b.floors * 17) % Math.max(24, b.h - 60));
        ctx.fillRect(cx, cy, 20, 14);
      }
      if (b.w >= 130) {                                             // painted sign
        ctx.font = '600 12px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,246,230,0.92)';
        ctx.fillText(b.name.toUpperCase(), bx + b.w / 2, by + b.h / 2 - lift + 4);
      }
    }
  },

  drawPalms(ctx, cam) {
    const x0 = cam.x, y0 = cam.y, x1 = cam.x + VIEW_W, y1 = cam.y + VIEW_H;
    for (const t of this.palms) {
      if (t.x < x0 - 40 || t.x > x1 + 40 || t.y < y0 - 40 || t.y > y1 + 40) continue;
      const x = t.x - x0, y = t.y - y0, s = t.s;
      ctx.strokeStyle = PALETTE.palmTrunk;
      ctx.lineWidth = 4 * s;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 3 * s, y - 9 * s, x + 6 * s, y - 16 * s); ctx.stroke();
      ctx.strokeStyle = PALETTE.palmLeaf;
      ctx.lineWidth = 3 * s;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.5;
        ctx.beginPath();
        ctx.moveTo(x + 6 * s, y - 16 * s);
        ctx.quadraticCurveTo(
          x + 6 * s + Math.cos(a) * 11 * s, y - 16 * s + Math.sin(a) * 7 * s - 3 * s,
          x + 6 * s + Math.cos(a) * 17 * s, y - 16 * s + Math.sin(a) * 10 * s + 3 * s);
        ctx.stroke();
      }
    }
  },
};
