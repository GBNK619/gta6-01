// save.js — localStorage autosave: cash, mission progress and where the
// player was standing, so the start screen can offer Continue.

const SAVE_KEY = 'palmera-heat-save-v1';
let saveTimer = 0;

const SaveSys = {
  exists() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  },
  write() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        cash: S.cash,
        missionIndex: Missions.index,
        x: Player.x, y: Player.y,
        stats: S.stats,
      }));
    } catch (e) { /* private mode etc. — saving is best-effort */ }
  },
  read() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  clear() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} },
  update(dt) {
    saveTimer += dt;
    if (saveTimer > 4 && S.mode === 'play') { saveTimer = 0; this.write(); }
  },
};
