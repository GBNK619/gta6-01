// random.js — a tiny seeded RNG (mulberry32) so Palmera City is laid out
// the same way on every visit and screenshot runs are reproducible.

function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const urlSeed = Number(new URLSearchParams(location.search).get('seed') || 7);
const rng = makeRng(urlSeed * 1000 + 17);

function randRange(lo, hi) { return lo + rng() * (hi - lo); }
function randInt(lo, hi) { return Math.floor(randRange(lo, hi + 1)); }
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
