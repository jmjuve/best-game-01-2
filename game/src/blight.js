// Blight: the vale's rot. It wakes on dry, mature crops, spreads to dry
// neighbours, and only lightning or snow can end it. A strike clears every
// blighted plot near the bolt; snow freezes blight where it falls.
import { STRIKE } from './config.js';

export function createBlight(random) {
  let bolts = [];
  let wakeTimer = 6;

  function step(dt, field, blightRate, mods, events) {
    wakeTimer -= dt;
    if (wakeTimer <= 0) {
      wakeTimer = random.range(5, 9);
      const dry = field.plots().filter((p) => !p.blighted && !p.withered && p.water < 22 && p.growth > 40);
      if (dry.length > 0 && random.chance(blightRate)) {
        const victim = random.pick(dry);
        if (field.blightPlot(victim)) events.push({ type: 'blight', plot: victim });
      }
    }
    // Spread: each blighted plot may infect a dry neighbour.
    for (const p of field.plots()) {
      if (!p.blighted) continue;
      if (p.blightTimer > 4 && random.chance(dt * 0.10 * (mods.blightMul || 1))) {
        const dryNeighbours = field.neighbours(p).filter((n) => !n.blighted && !n.withered && n.water < 30);
        if (dryNeighbours.length > 0) {
          const victim = random.pick(dryNeighbours);
          if (field.blightPlot(victim)) events.push({ type: 'blight', plot: victim });
        }
      }
    }
    for (const b of bolts) b.life -= dt;
    bolts = bolts.filter((b) => b.life > 0);
  }
  function strike(x, y, field, events) {
    bolts.push({ x, y, life: 0.5, maxLife: 0.5 });
    let cleared = 0;
    for (const p of field.plots()) {
      const cx = p.x + p.w / 2; const cy = p.y + p.h / 2;
      if (Math.hypot(cx - x, cy - y) < STRIKE.clearRadius && p.blighted) {
        if (field.clearBlight(p)) cleared += 1;
      }
    }
    events.push({ type: 'strike', x, y, cleared });
    return cleared;
  }
  function snowClear(cloud, field) {
    let cleared = 0;
    for (const p of field.plotsUnder(cloud.x, 90)) {
      if (p.blighted && field.clearBlight(p)) cleared += 1;
    }
    return cleared;
  }
  function reset() { bolts = []; wakeTimer = 6; }
  return {
    step, strike, snowClear, reset,
    bolts() { return bolts; },
  };
}
