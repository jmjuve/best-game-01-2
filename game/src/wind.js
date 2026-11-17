// Wind lanes: the wright's signature. A drag paints a curved lane of wind
// that lives a few seconds, fades, and pulls any cloud inside its reach
// along the lane's direction. Ink is the budget: long lanes cost more.
import { WIND } from './config.js';

export function createWind() {
  let lanes = [];
  let totalDrawn = 0;

  function addLane(points, inkAvailable) {
    let length = 0;
    for (let i = 1; i < points.length; i += 1) {
      length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    if (length < WIND.minLen) return { ok: false, cost: 0 };
    const cost = Math.round(length * WIND.inkPerPx);
    if (cost > inkAvailable) return { ok: false, cost };
    // Resample the stroke into evenly spaced nodes so the pull is smooth.
    const nodes = [];
    let acc = 0;
    nodes.push({ x: points[0].x, y: points[0].y });
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1]; const b = points[i];
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.floor(seg / 14));
      for (let s = 1; s <= steps; s += 1) {
        const t = s / steps;
        nodes.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
      acc += seg;
    }
    lanes.push({ nodes, life: WIND.laneLife, maxLife: WIND.laneLife, length });
    if (lanes.length > WIND.maxLanes) lanes.shift();
    totalDrawn += 1;
    return { ok: true, cost };
  }
  function step(dt) {
    for (const lane of lanes) lane.life -= dt;
    lanes = lanes.filter((l) => l.life > 0);
  }
  // The wind vector at a point: sum of nearby lane segments, weighted by
  // closeness and by how fresh the lane is. Returns {x, y} in px per second.
  function flowAt(x, y, windMul) {
    let fx = 0; let fy = 0;
    for (const lane of lanes) {
      const freshness = Math.min(1, lane.life / (lane.maxLife * 0.5));
      for (let i = 1; i < lane.nodes.length; i += 1) {
        const a = lane.nodes[i - 1]; const b = lane.nodes[i];
        const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2;
        const d = Math.hypot(x - mx, y - my);
        if (d > WIND.radius) continue;
        const w = (1 - d / WIND.radius) * freshness;
        const segLen = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        fx += ((b.x - a.x) / segLen) * w;
        fy += ((b.y - a.y) / segLen) * w;
      }
    }
    const mag = Math.hypot(fx, fy);
    if (mag < 0.01) return { x: 0, y: 0 };
    const strength = Math.min(1, mag) * WIND.pull * (windMul || 1);
    return { x: (fx / mag) * strength, y: (fy / mag) * strength };
  }
  function clear() { lanes = []; }
  return {
    addLane, step, flowAt, clear,
    lanes() { return lanes; },
    totalDrawn() { return totalDrawn; },
  };
}
