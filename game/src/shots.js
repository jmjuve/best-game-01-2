// Screenshot scenes for Stormwright: ?shot=start|play|draft|end stages a
// real frame by playing the real rules forward from a fresh world with a
// fixed seed and a simple autopilot, so every screenshot is what a short
// game genuinely looks like. The play pilot steers rain toward the driest
// plots and harvests ripe crops; the end pilot is the same pilot run all
// the way through six seasons, sped up by stepping the world directly.
import { STEP, VALLEY, SKY } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_DRAFT, SCREEN_VICTORY, SCREEN_DEFEAT } from './render.js';

function driestPlot(world) {
  let best = null;
  for (const p of world.field.plots()) {
    if (p.blighted || p.withered || p.ripe) continue;
    if (!best || p.water < best.water) best = p;
  }
  return best;
}
function ripestPlot(world) {
  for (const p of world.field.plots()) if (p.ripe) return p;
  return null;
}
// The autopilot's wind: one lane from the nearest cloud toward the driest
// plot, redrawn whenever the old lane fades.
function autopilotStroke(world, run) {
  const clouds = world.clouds.list();
  if (clouds.length === 0) return null;
  const target = driestPlot(world);
  if (!target) return null;
  const cloud = clouds[0];
  const tx = target.x + target.w / 2; const ty = target.y + target.h / 2;
  const points = [];
  for (let i = 0; i <= 8; i += 1) {
    const t = i / 8;
    points.push({
      x: cloud.x + (tx - cloud.x) * t,
      y: cloud.y + (ty - cloud.y) * t + Math.sin(t * Math.PI) * -20,
    });
  }
  return points;
}
function autopilotClick(world) {
  const ripe = ripestPlot(world);
  if (ripe) return { x: ripe.x + ripe.w / 2, y: ripe.y + ripe.h / 2 };
  const blighted = world.field.plots().find((p) => p.blighted);
  if (blighted) {
    const storm = world.clouds.list().find((c) => c.kind === 'storm');
    if (storm) return { x: storm.x, y: storm.y };
  }
  return null;
}
function runAutopilot(world, run, seconds, clickEvery, stopAtDraft) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    let stroke = null;
    if (world.wind.lanes().length === 0 && i % 90 === 0) stroke = autopilotStroke(world, run);
    let click = null;
    if (i % Math.max(1, Math.floor(clickEvery / STEP)) === 0) click = autopilotClick(world);
    const ev = world.step(STEP, stroke, click, false);
    if (world.phase() === 'draft') {
      if (stopAtDraft) break;
      world.pickCharm(0);
    }
    if (world.phase() === 'victory' || world.phase() === 'defeat') break;
  }
}

export function stageShot(name, world, run) {
  world.resetDemo();
  run.reset(world.difficulty());
  if (name === 'start') {
    for (let i = 0; i < 5 / STEP; i += 1) world.stepDemo(STEP);
    return { screen: SCREEN_TITLE, best: run.readBest() };
  }
  world.startRun('steady', run);
  if (name === 'play') {
    runAutopilot(world, run, 34, 0.5);
    if (world.phase() === 'draft') world.pickCharm(0);
    return { screen: world.phase() === 'victory' ? SCREEN_VICTORY : world.phase() === 'defeat' ? SCREEN_DEFEAT : SCREEN_PLAY, best: run.readBest() };
  }
  if (name === 'draft') {
    runAutopilot(world, run, 200, 0.4, true);
    if (world.phase() === 'draft') return { screen: SCREEN_DRAFT, best: run.readBest() };
    // The pilot cleared the season too fast and moved on: re-stage the draft
    // by replaying from a fresh run with a shorter horizon is wasteful, so
    // fall back to the live phase's screen instead of faking a draft.
    return { screen: world.phase() === 'victory' ? SCREEN_VICTORY : world.phase() === 'defeat' ? SCREEN_DEFEAT : SCREEN_PLAY, best: run.readBest() };
  }
  // end: play the whole run through; the pilot aims to win.
  runAutopilot(world, run, 900, 0.35);
  if (world.phase() === 'victory') return { screen: SCREEN_VICTORY, best: Math.max(run.readBest(), run.state.score) };
  if (world.phase() === 'defeat') return { screen: SCREEN_DEFEAT, best: run.readBest() };
  // The pilot ran out of simulated time mid-run: show the play screen rather
  // than a staged ending the rules never reached.
  return { screen: SCREEN_PLAY, best: run.readBest() };
}
