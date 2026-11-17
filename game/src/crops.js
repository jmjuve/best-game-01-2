// Crops and the field grid: 8 by 4 plots of soil. A plot holds one crop
// with water, sun and growth; water plus sun grows it, rain waters it,
// ember light ripens it, drought dries it. Ripe crops wait to be harvested,
// then wither if ignored. Blight is tracked here too: a blighted plot
// grows nothing and infects dry neighbours.
import { CROPS, CROP_KEYS, FIELD, FIELD_COLS, FIELD_ROWS } from './config.js';

export function createField(random) {
  const plotW = FIELD.width / FIELD_COLS;
  const plotH = FIELD.height / FIELD_ROWS;
  let plots = [];

  function plantPlot(plot, kind) {
    plot.kind = kind;
    plot.def = CROPS[kind];
    plot.growth = 0; plot.water = random.range(28, 52); plot.sun = random.range(8, 22);
    plot.ripe = false; plot.withered = false; plot.blighted = false;
    plot.ripeTimer = 0; plot.blightTimer = 0;
  }
  function reset(moonSeeds) {
    plots = [];
    for (let r = 0; r < FIELD_ROWS; r += 1) {
      for (let c = 0; c < FIELD_COLS; c += 1) {
        const plot = { col: c, row: r, x: FIELD.x + c * plotW, y: FIELD.y + r * plotH, w: plotW, h: plotH };
        const roll = random.next();
        const kind = moonSeeds && roll > 0.88 ? 'moonmelon' : roll > 0.62 ? 'pumpkin' : roll > 0.34 ? 'berry' : 'wheat';
        plantPlot(plot, kind);
        plots.push(plot);
      }
    }
  }
  function plotAt(x, y) {
    for (const p of plots) {
      if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) return p;
    }
    return null;
  }
  function plotsUnder(x, width) {
    return plots.filter((p) => p.x + p.w > x - width / 2 && p.x < x + width / 2);
  }
  function step(dt, mods, drought, events) {
    for (const p of plots) {
      if (p.blighted) {
        p.blightTimer += dt;
        continue;
      }
      // Soil dries steadily; rain and snow refill it (see waterPlot).
      p.water = Math.max(0, p.water - drought * dt * (1 / (mods.waterHold || 1)));
      p.sun = Math.max(0, p.sun - dt * 1.5);
      if (!p.ripe && !p.withered) {
        const thirsty = p.water > p.def.waterNeed * 0.35;
        const lit = p.sun > p.def.sunNeed * 0.3;
        if (thirsty && lit) p.growth += (100 / p.def.growTime) * dt * (p.sun > p.def.sunNeed * 0.8 ? 1.25 : 1);
        else if (thirsty || lit) p.growth += (100 / p.def.growTime) * dt * 0.35;
        if (p.growth >= 100) {
          p.growth = 100; p.ripe = true; p.ripeTimer = 0;
          events.push({ type: 'ripe', plot: p });
        }
      } else if (p.ripe) {
        p.ripeTimer += dt;
        if (p.ripeTimer > 14) {
          p.withered = true; p.ripe = false;
          events.push({ type: 'wither', plot: p });
        }
      }
    }
  }
  function waterPlot(plot, amount) {
    if (plot.blighted) return;
    plot.water = Math.min(100, plot.water + amount);
  }
  function sunPlot(plot, amount) {
    if (plot.blighted) return;
    plot.sun = Math.min(100, plot.sun + amount);
    // Ember light ripens a well-watered crop directly.
    if (!plot.ripe && !plot.withered && plot.water > 30) {
      plot.growth = Math.min(100, plot.growth + amount * 0.55);
      if (plot.growth >= 100) { plot.growth = 100; plot.ripe = true; plot.ripeTimer = 0; }
    }
  }
  function scorchCheck(plot, mods) {
    if (mods.noScorch || plot.blighted || plot.ripe) return false;
    if (plot.water < 12 && plot.sun > 70) {
      plot.withered = true;
      return true;
    }
    return false;
  }
  function harvest(plot, mods) {
    if (!plot.ripe || plot.blighted) return null;
    let value = Math.round(plot.def.value * (mods.valueMul || 1));
    if (plot.kind === 'moonmelon') value += mods.moonBonus || 0;
    const kind = plot.kind;
    plantPlot(plot, plot.kind);
    // Replant the same crop, fresh and thirsty.
    return { value, kind };
  }
  function clearBlight(plot) {
    if (!plot.blighted) return false;
    plot.blighted = false; plot.blightTimer = 0;
    plot.water = Math.max(plot.water, 40);
    return true;
  }
  function blightPlot(plot) {
    if (plot.blighted || plot.withered) return false;
    plot.blighted = true; plot.blightTimer = 0; plot.ripe = false;
    return true;
  }
  function neighbours(plot) {
    return plots.filter((p) => p !== plot && Math.abs(p.col - plot.col) <= 1 && Math.abs(p.row - plot.row) <= 1);
  }
  function counts() {
    let ripe = 0; let blighted = 0; let withered = 0; let growing = 0;
    for (const p of plots) {
      if (p.blighted) blighted += 1;
      else if (p.withered) withered += 1;
      else if (p.ripe) ripe += 1;
      else growing += 1;
    }
    return { ripe, blighted, withered, growing, total: plots.length };
  }
  return {
    reset, plotAt, plotsUnder, step, waterPlot, sunPlot, scorchCheck,
    harvest, clearBlight, blightPlot, neighbours, counts,
    plots() { return plots; },
    plotSize() { return { w: plotW, h: plotH }; },
    cropKeys() { return CROP_KEYS; },
  };
}
