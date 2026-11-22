// hud.js — everything drawn over the world: cash and health, wanted stars,
// the current job, the minimap, banners, and the menu / pause / wasted /
// busted screens. The minimap is the city's own data, shrunk.

const Hud = {
  menuRects: [],

  star(ctx, x, y, r, filled) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = filled ? '#ffd23e' : 'rgba(255,255,255,0.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1; ctx.stroke();
  },

  drawMinimap(ctx) {
    const W = 216, H = 154, x0 = VIEW_W - W - 16, y0 = 16;
    const sx = W / WORLD_W, sy = H / WORLD_H;
    ctx.fillStyle = 'rgba(14,20,32,0.82)';
    roundRect(ctx, x0 - 4, y0 - 4, W + 8, H + 8, 8); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, W, H); ctx.clip();
    ctx.fillStyle = '#274b63';
    ctx.fillRect(x0 + WATER_X * sx, y0, (WORLD_W - WATER_X) * sx, H);
    ctx.fillStyle = '#c9ab72';
    ctx.fillRect(x0 + SAND_X * sx, y0, (WATER_X - SAND_X) * sx, H);
    ctx.fillStyle = '#3a3f4a';
    for (const ax of AVENUES) ctx.fillRect(x0 + (ax - ROAD_W / 2) * sx, y0, ROAD_W * sx, H);
    for (const sy of STREETS) ctx.fillRect(x0, y0, (sy - ROAD_W / 2) * sy, SAND_X * sx, ROAD_W * sy);
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    for (const b of City.buildings) ctx.fillRect(x0 + b.x * sx, y0 + b.y * sy, Math.max(1.6, b.w * sx), Math.max(1.6, b.h * sy));
    // Mission target.
    const tp = Missions.targetPoint() || Missions.startSpot();
    if (tp) {
      const blink = Math.sin(S.time * 5) > -0.3;
      if (blink) {
        ctx.fillStyle = '#ffd23e';
        ctx.beginPath(); ctx.arc(x0 + tp.x * sx, y0 + tp.y * sy, 4.4, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Police.
    for (const u of Police.units) {
      ctx.fillStyle = Math.floor(S.time * 5) % 2 ? '#ff5147' : '#4da3ff';
      ctx.beginPath(); ctx.arc(x0 + u.x * sx, y0 + u.y * sy, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    // Player arrow.
    const px = x0 + Player.x * sx, py = y0 + Player.y * sy;
    ctx.save();
    ctx.translate(px, py); ctx.rotate(Player.angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(0, -5.4); ctx.lineTo(3.8, 4.4); ctx.lineTo(-3.8, 4.4); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
    roundRect(ctx, x0 - 4, y0 - 4, W + 8, H + 8, 8); ctx.stroke();
  },

  draw(ctx) {
    // Objective panel, top-left.
    ctx.textAlign = 'left';
    if (Missions.active) {
      const w = 430;
      ctx.fillStyle = 'rgba(12,14,24,0.72)';
      roundRect(ctx, 14, 14, w, Missions.active.timer !== null ? 84 : 66, 8); ctx.fill();
      ctx.fillStyle = '#ffd23e';
      ctx.font = '700 13px "Segoe UI", sans-serif';
      ctx.fillText('JOB — ' + Missions.active.def.title.toUpperCase(), 26, 38);
      ctx.fillStyle = '#f4f1e8';
      ctx.font = '15px "Segoe UI", sans-serif';
      ctx.fillText(Missions.objectiveText(), 26, 62);
      if (Missions.active.timer !== null) {
        const t = Math.max(0, Missions.active.timer);
        ctx.fillStyle = t < 15 ? '#ff5147' : '#ffd23e';
        ctx.font = '700 14px "Segoe UI", sans-serif';
        ctx.fillText('⏱ ' + Math.ceil(t) + 's', 26, 86);
      }
    } else if (Missions.index < Missions.DEFS.length) {
      ctx.fillStyle = 'rgba(12,14,24,0.6)';
      roundRect(ctx, 14, 14, 386, 40, 8); ctx.fill();
      ctx.fillStyle = '#aee6ff';
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.fillText('Marco has work for you — Palmera Suites, follow the blue beam', 26, 39);
    } else {
      ctx.fillStyle = 'rgba(12,14,24,0.6)';
      roundRect(ctx, 14, 14, 330, 40, 8); ctx.fill();
      ctx.fillStyle = '#aee6ff';
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.fillText('All jobs done — Palmera City is yours', 26, 39);
    }

    this.drawMinimap(ctx);
    // Wanted stars under the minimap.
    const stars = Police.stars();
    for (let i = 0; i < 5; i++) {
      this.star(ctx, VIEW_W - 196 + i * 40, 196, 13, i < stars);
    }
    if (S.bustMeter > 0.02 && Player.car) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(VIEW_W - 216, 214, 200, 10);
      ctx.fillStyle = '#ff3b30';
      ctx.fillRect(VIEW_W - 215, 215, 198 * S.bustMeter, 8);
    }

    // Cash + health, bottom-left.
    ctx.fillStyle = 'rgba(12,14,24,0.72)';
    roundRect(ctx, 14, VIEW_H - 86, 250, 72, 8); ctx.fill();
    ctx.fillStyle = '#7be495';
    ctx.font = '700 26px "Segoe UI", sans-serif';
    ctx.fillText('$' + S.cash.toLocaleString('en-US'), 26, VIEW_H - 52);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(26, VIEW_H - 40, 180, 10);
    ctx.fillStyle = S.health > 30 ? '#e84a4a' : '#ff2020';
    ctx.fillRect(26, VIEW_H - 40, 180 * clamp(S.health, 0, 100) / 100, 10);
    ctx.fillStyle = '#f4f1e8';
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillText('✊ fists', 26, VIEW_H - 74 + 52);
    if (Player.car) {
      const kmh = Math.round(Math.abs(Player.car.speed) * 0.36);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#f4f1e8';
      ctx.font = '700 30px "Segoe UI", sans-serif';
      ctx.fillText(kmh + '', VIEW_W - 66, VIEW_H - 44);
      ctx.font = '13px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(244,241,232,0.75)';
      ctx.fillText('km/h · ' + Player.car.model.name, VIEW_W - 16, VIEW_H - 44);
      ctx.textAlign = 'left';
    }

    // Context prompt, bottom-centre.
    if (S.prompt) {
      ctx.font = '600 15px "Segoe UI", sans-serif';
      const w = ctx.measureText(S.prompt).width + 30;
      ctx.fillStyle = 'rgba(12,14,24,0.78)';
      roundRect(ctx, (VIEW_W - w) / 2, VIEW_H - 48, w, 32, 16); ctx.fill();
      ctx.fillStyle = '#ffd23e';
      ctx.textAlign = 'center';
      ctx.fillText(S.prompt, VIEW_W / 2, VIEW_H - 27);
      ctx.textAlign = 'left';
    }

    // Centre banner.
    if (S.banner && S.time < S.banner.until) {
      const left = S.banner.until - S.time;
      const a = clamp(left / 0.6, 0, 1);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd23e';
      ctx.font = '800 44px "Segoe UI", sans-serif';
      ctx.fillText(S.banner.title, VIEW_W / 2, 190);
      ctx.fillStyle = '#f4f1e8';
      ctx.font = '19px "Segoe UI", sans-serif';
      ctx.fillText(S.banner.sub, VIEW_W / 2, 224);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }

    // Hurt flash + low-health pulse.
    const sinceHurt = S.time - S.hurtAt;
    let red = 0;
    if (sinceHurt < 0.45) red = 0.26 * (1 - sinceHurt / 0.45);
    if (S.health < 30 && S.mode === 'play') red = Math.max(red, 0.13 + Math.sin(S.time * 5) * 0.05);
    if (red > 0) {
      const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.36, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.78);
      g.addColorStop(0, 'rgba(200,20,20,0)');
      g.addColorStop(1, 'rgba(200,20,20,' + red + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  },

  drawMenu(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, 'rgba(30,10,46,0.55)');
    g.addColorStop(0.55, 'rgba(90,26,52,0.42)');
    g.addColorStop(1, 'rgba(20,8,26,0.72)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff9d45';
    ctx.font = '800 30px "Segoe UI", sans-serif';
    ctx.fillText('P A L M E R A   C I T Y', VIEW_W / 2, 150);
    ctx.fillStyle = '#ffd23e';
    ctx.font = '900 96px "Segoe UI", sans-serif';
    ctx.fillText('PALMERA HEAT', VIEW_W / 2, 248);
    ctx.fillStyle = '#f4f1e8';
    ctx.font = '19px "Segoe UI", sans-serif';
    ctx.fillText('One city. Five jobs. Every car is yours — if you can outrun the Precinct.', VIEW_W / 2, 292);

    this.menuRects = [];
    const items = [{ id: 'new', label: '▶  NEW GAME' }];
    if (SaveSys.exists()) items.push({ id: 'continue', label: '▶  CONTINUE' });
    items.push({ id: 'mute', label: S.muted ? '🔇  SOUND: OFF (M)' : '🔊  SOUND: ON (M)' });
    ctx.font = '700 26px "Segoe UI", sans-serif';
    items.forEach((it, i) => {
      const y = 372 + i * 52;
      const w = 340, x = (VIEW_W - w) / 2;
      const hover = mouse.x >= x && mouse.x <= x + w && mouse.y >= y - 34 && mouse.y <= y + 10;
      ctx.fillStyle = hover ? 'rgba(255,210,63,0.92)' : 'rgba(12,14,24,0.78)';
      roundRect(ctx, x, y - 34, w, 44, 10); ctx.fill();
      ctx.fillStyle = hover ? '#241832' : '#ffd23e';
      ctx.fillText(it.label, VIEW_W / 2, y);
      this.menuRects.push({ id: it.id, x, y: y - 34, w, h: 44 });
    });

    ctx.fillStyle = 'rgba(12,14,24,0.66)';
    roundRect(ctx, VIEW_W / 2 - 330, 556, 660, 148, 10); ctx.fill();
    ctx.fillStyle = '#f4f1e8';
    ctx.font = '16px "Segoe UI", sans-serif';
    const lines = [
      'WASD / arrows — move & drive      Shift — run      E — enter car / take job',
      'F or click — punch      Space — handbrake      P — pause      M — mute',
      'Steal cars, run Marco\'s jobs, and whatever you do — don\'t get busted.',
    ];
    lines.forEach((ln, i) => ctx.fillText(ln, VIEW_W / 2, 596 + i * 30));
    ctx.fillStyle = 'rgba(244,241,232,0.6)';
    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.fillText('A tiny open-world crime game · built with vanilla JS + Canvas', VIEW_W / 2, 748);
    ctx.textAlign = 'left';
  },

  drawPause(ctx) {
    ctx.fillStyle = 'rgba(10,8,20,0.62)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23e';
    ctx.font = '800 54px "Segoe UI", sans-serif';
    ctx.fillText('PAUSED', VIEW_W / 2, 360);
    ctx.fillStyle = '#f4f1e8';
    ctx.font = '19px "Segoe UI", sans-serif';
    ctx.fillText('P — resume · R — restart the night · progress autosaves', VIEW_W / 2, 410);
    ctx.textAlign = 'left';
  },

  drawEndScreen(ctx, kind) {
    ctx.fillStyle = kind === 'wasted' ? 'rgba(60,4,8,0.66)' : 'rgba(6,16,44,0.66)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = kind === 'wasted' ? '#ff5147' : '#7db4ff';
    ctx.font = '900 84px "Segoe UI", sans-serif';
    ctx.fillText(kind === 'wasted' ? 'WASTED' : 'BUSTED', VIEW_W / 2, 380);
    ctx.fillStyle = '#f4f1e8';
    ctx.font = '19px "Segoe UI", sans-serif';
    ctx.fillText(
      kind === 'wasted'
        ? 'You woke up at Clínica del Mar. The night goes on — press Enter.'
        : 'Palmera Precinct let you go with a fine and a warning — press Enter.',
      VIEW_W / 2, 428);
    ctx.textAlign = 'left';
  },
};
