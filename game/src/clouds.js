// Clouds: the weather itself. They spawn at a sky edge per the season's
// forecast, drift with the base breeze plus any wind lanes, rain or shine
// onto the plots beneath them, and leave when they drift off the far edge
// or their life runs out. Storm clouds hold the lightning charge.
import { CLOUDS, CLOUD_KEYS, SKY, VALLEY } from './config.js';

export function createClouds(random) {
  let clouds = [];
  let nextId = 1;

  function spawn(kind, x, y) {
    const def = CLOUDS[kind];
    clouds.push({
      id: nextId, kind, def,
      x: x !== undefined ? x : (random.chance(0.5) ? -70 : VALLEY.x + VALLEY.width + 70),
      y: y !== undefined ? y : random.range(SKY.y + 8, SKY.y + SKY.height - 34),
      vx: 0, vy: 0,
      dir: 0, life: def.life * random.range(0.85, 1.2),
      maxLife: def.life, size: random.range(0.85, 1.25),
      wobble: random.range(0, Math.PI * 2),
    });
    nextId += 1;
  }
  function pickKind(forecast, snowMul) {
    const weights = CLOUD_KEYS.map((k) => ({
      value: k,
      weight: (forecast[k] || 0) * (k === 'snow' ? (snowMul || 1) : 1),
    }));
    return random.weighted(weights);
  }
  function step(dt, wind, mods, onWeather) {
    for (const c of clouds) {
      c.life -= dt;
      c.wobble += dt * 1.4;
      // Base breeze: always eastward, slower for rain, faster for storms.
      const base = c.def.speed * (c.kind === 'rain' ? (mods.rainSlow || 1) : 1) * (c.dir === 0 ? 1 : c.dir);
      const flow = wind.flowAt(c.x, c.y, mods.windMul || 1);
      const targetVx = base + flow.x;
      const targetVy = flow.y * 0.9 + Math.sin(c.wobble) * 3;
      c.vx += (targetVx - c.vx) * Math.min(1, dt * 2.2);
      c.vy += (targetVy - c.vy) * Math.min(1, dt * 2.2);
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      // Keep clouds in the sky band; wind can push them, the sky pulls back.
      if (c.y < SKY.y + 6) c.y = SKY.y + 6;
      if (c.y > SKY.y + SKY.height - 20) c.y = SKY.y + SKY.height - 20;
      if (onWeather) onWeather(c, dt);
    }
    clouds = clouds.filter((c) => c.life > 0 && c.x > -140 && c.x < VALLEY.x + VALLEY.width + 140);
  }
  function strikeAt(x, y) {
    for (const c of clouds) {
      if (c.kind === 'storm' && Math.hypot(c.x - x, c.y - y) < 90) return c;
    }
    return null;
  }
  function remove(cloud) { clouds = clouds.filter((c) => c !== cloud); }
  function clear() { clouds = []; }
  function forecastNext(forecast, snowMul, count) {
    const out = [];
    for (let i = 0; i < count; i += 1) out.push(pickKind(forecast, snowMul));
    return out;
  }
  return {
    spawn, pickKind, step, strikeAt, remove, clear, forecastNext,
    list() { return clouds; },
  };
}
