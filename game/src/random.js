// Seeded randomness for Stormwright: a small mulberry32 generator plus the
// helpers the world uses (pick, range, weighted choice, shuffle). A fixed
// seed makes the same run, the same forecast and the same screenshot.
export function createRandom(seed) {
  let a = seed >>> 0;
  if (a === 0) a = 0x9e3779b9;
  function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function range(min, max) { return min + next() * (max - min); }
  function int(min, max) { return Math.floor(range(min, max + 1)); }
  function pick(list) { return list[Math.floor(next() * list.length)]; }
  function chance(p) { return next() < p; }
  function weighted(entries) {
    let total = 0;
    for (const e of entries) total += e.weight;
    let roll = next() * total;
    for (const e of entries) { roll -= e.weight; if (roll <= 0) return e.value; }
    return entries[entries.length - 1].value;
  }
  function shuffle(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }
  return { next, range, int, pick, chance, weighted, shuffle, seed };
}
