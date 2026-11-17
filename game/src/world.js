// The world: one object that owns the valley's simulation. It steps wind,
// clouds, crops and blight in fixed steps, spawns clouds from the season's
// forecast, turns weather into water and sun on the plots, and owns the
// season clock, the quota, the charm draft and the win/lose decision.
import { STEP, SEASON_LENGTH, SEASON_COUNT, DIFFICULTIES, CLOUDS } from './config.js';
import { createRandom } from './random.js';
import { createWind } from './wind.js';
import { createClouds } from './clouds.js';
import { createField } from './crops.js';
import { createBlight } from './blight.js';
import { createCharms, baseModifiers } from './charms.js';
import { createFeats, seasonDef, seasonQuota, gradeFor } from './seasons.js';

export const EVENT_OVER = 1;
export const EVENT_SEASON_CLEAR = 2;
export const EVENT_RIPE = 4;

export function createWorld(seed) {
  const random = createRandom(seed);
  const wind = createWind();
  const clouds = createClouds(random);
  const field = createField(random);
  const blight = createBlight(random);
  const charms = createCharms(random);
  const feats = createFeats();
  let difficultyKey = 'steady';
  let difficulty = DIFFICULTIES.steady;
  let mods = baseModifiers(difficulty);
  let run = null;
  let phase = 'title';
  let seasonTimer = SEASON_LENGTH;
  let spawnTimer = 2;
  let forecast = [];
  let quota = 0;
  let seasonBlighted = 0;
  let seasonWithered = 0;
  let victory = null;
  let defeat = null;
  let lastEvents = [];

  function attachRun(runState) { run = runState; }

  function startRun(key, runState) {
    difficultyKey = key;
    difficulty = DIFFICULTIES[key];
    mods = baseModifiers(difficulty);
    attachRun(runState);
    runState.reset(difficulty);
    runState.inkMax = mods.inkMax;
    runState.ink = mods.inkMax;
    charms.reset(); feats.reset();
    wind.clear(); clouds.clear(); blight.reset();
    field.reset(false);
    beginSeason(0);
    phase = 'play';
  }
  function beginSeason(index) {
    const def = seasonDef(index);
    quota = seasonQuota(index, difficulty);
    seasonTimer = SEASON_LENGTH;
    spawnTimer = 1.2;
    seasonBlighted = 0; seasonWithered = 0;
    forecast = clouds.forecastNext(def.clouds, mods.snowMul, 4);
    run.state.season = index;
    run.state.seasonScore = 0;
    run.state.seasonHarvest = 0;
    run.state.seasonTime = 0;
    run.message(`Season ${index + 1}: ${def.name} — harvest ${quota} gold of crops.`);
  }
  function offerDraft() {
    phase = 'draft';
    charms.offer();
  }
  function pickCharm(index) {
    const charm = charms.pick(index, mods);
    if (!charm) return null;
    run.state.inkMax = mods.inkMax;
    run.message(`Charm taken: ${charm.name}.`);
    const next = run.state.season + 1;
    if (next >= SEASON_COUNT) {
      endRun(true);
    } else {
      beginSeason(next);
      phase = 'play';
    }
    return charm;
  }
  function endRun(won) {
    if (won) {
      const grade = gradeFor(run.state.score);
      victory = {
        grade: grade.grade, title: grade.title,
        score: run.state.score, gold: run.state.gold,
        harvests: run.state.harvests, bestCombo: run.state.bestCombo,
        strikes: run.state.strikes, lanes: run.state.lanesDrawn,
        seasons: SEASON_COUNT, feats: feats.list().filter((f) => f.earned),
        difficulty: difficulty.label,
      };
      run.saveBest();
      run.saveHall(grade.grade, SEASON_COUNT);
      phase = 'victory';
    } else {
      defeat = {
        score: run.state.score, season: run.state.season + 1,
        seasonName: seasonDef(run.state.season).name,
        harvested: run.state.seasonHarvest, quota,
        harvests: run.state.harvests, bestCombo: run.state.bestCombo,
        difficulty: difficulty.label,
      };
      run.saveBest();
      run.saveHall('D', run.state.seasonsCleared);
      phase = 'defeat';
    }
  }
  function failSeason() {
    endRun(false);
  }

  function weatherOnCloud(cloud, dt) {
    const def = cloud.def;
    const width = 64 * cloud.size;
    const plots = field.plotsUnder(cloud.x, width);
    if (def.rain > 0) {
      for (const p of plots) field.waterPlot(p, def.rain * dt * 0.55);
      run.state.rainDrops += dt * plots.length;
    } else if (def.rain < 0) {
      for (const p of plots) {
        p.water = Math.max(0, p.water + def.rain * dt * 0.4);
        field.sunPlot(p, def.sun * dt * 0.4 * (mods.sunMul || 1));
        if (field.scorchCheck(p, mods)) { seasonWithered += 1; run.state.withered += 1; }
      }
    }
    if (def.sun > 0 && def.rain >= 0) {
      for (const p of plots) field.sunPlot(p, def.sun * dt * 0.35 * (mods.sunMul || 1));
    }
    if (cloud.kind === 'storm') run.state.charge = Math.min(100, run.state.charge + def.charge * dt * 0.35 * (mods.chargeMul || 1));
    if (cloud.kind === 'snow') {
      const cleared = blight.snowClear(cloud, field);
      if (cleared > 0) { run.state.blightsCleared += cleared; }
    }
  }

  function step(dt, stroke, click, strikeKey) {
    lastEvents = [];
    if (phase !== 'play') return 0;
    const def = seasonDef(run.state.season);
    seasonTimer -= dt;
    run.state.seasonTime += dt;
    run.tickCombo(dt);
    // Wind ink regenerates; drawing spends it.
    run.state.ink = Math.min(mods.inkMax, run.state.ink + mods.inkRegen * dt);
    run.state.inkMax = mods.inkMax;
    if (stroke) {
      const res = wind.addLane(stroke, run.state.ink);
      if (res.ok) {
        run.state.ink -= res.cost;
        run.state.lanesDrawn += 1;
        if (run.state.lanesDrawn === 25) {
          const f = feats.earn('wind-artist');
          if (f) run.message(`Feat earned: ${f.name}!`);
        }
      }
    }
    if (click) handleClick(click);
    if (strikeKey) strikeNearestStorm();
    // Cloud spawns from the forecast queue.
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = def.spawnEvery * difficulty.spawnMul * random.range(0.8, 1.25);
      const kind = forecast.shift() || clouds.pickKind(def.clouds, mods.snowMul);
      forecast.push(clouds.pickKind(def.clouds, mods.snowMul));
      const fromLeft = random.chance(0.55);
      clouds.spawn(kind, fromLeft ? -70 : 950, undefined);
      const spawned = clouds.list()[clouds.list().length - 1];
      if (spawned) spawned.dir = fromLeft ? 1 : -1;
    }
    wind.step(dt);
    clouds.step(dt, wind, mods, weatherOnCloud);
    const events = [];
    field.step(dt, mods, def.drought * difficulty.droughtMul, events);
    for (const e of events) {
      if (e.type === 'wither') { seasonWithered += 1; run.state.withered += 1; }
      if (e.type === 'blight') { seasonBlighted += 1; run.state.blightedTotal += 1; }
    }
    blight.step(dt, field, def.blight * difficulty.blightMul, mods, events);
    for (const e of events) {
      if (e.type === 'blight') { seasonBlighted += 1; run.state.blightedTotal += 1; }
      if (e.type === 'strike') run.state.blightsCleared += e.cleared;
    }
    lastEvents = events;
    // Season end: quota met early, or the clock runs out.
    if (run.state.seasonHarvest >= quota) {
      const over = run.state.seasonHarvest >= Math.round(quota * 1.5);
      if (over) {
        const f = feats.earn('over-quota');
        if (f) run.message(`Feat earned: ${f.name}!`);
      }
      if (seasonBlighted === 0) {
        const f = feats.earn('no-blight');
        if (f) run.message(`Feat earned: ${f.name}!`);
      }
      if (seasonWithered === 0) {
        const f = feats.earn('perfect-season');
        if (f) run.message(`Feat earned: ${f.name}!`);
      }
      run.state.seasonsCleared += 1;
      run.addScore(150 + run.state.season * 50);
      offerDraft();
      return EVENT_SEASON_CLEAR;
    }
    if (seasonTimer <= 0) {
      failSeason();
      return EVENT_OVER;
    }
    return 0;
  }
  function handleClick(p) {
    // Storm cloud first: a click on a storm cloud strikes lightning there.
    const storm = clouds.strikeAt(p.x, p.y);
    if (storm) {
      strikeAt(storm.x, storm.y + 60);
      return;
    }
    // Then a ripe plot: harvest it.
    const plot = field.plotAt(p.x, p.y);
    if (plot && plot.ripe) {
      const res = field.harvest(plot, mods);
      if (res) {
        const gained = run.harvest(res.value, res.kind);
        if (run.state.harvests === 1) {
          const f = feats.earn('first-harvest');
          if (f) run.message(`Feat earned: ${f.name}!`);
        }
        if (run.state.bestCombo >= 5) {
          const f = feats.earn('combo-5');
          if (f) run.message(`Feat earned: ${f.name}!`);
        }
        if (run.state.bestCombo >= 10) {
          const f = feats.earn('combo-10');
          if (f) run.message(`Feat earned: ${f.name}!`);
        }
        if (res.kind === 'moonmelon') {
          const f = feats.earn('moon-harvest');
          if (f) run.message(`Feat earned: ${f.name}!`);
        }
        if (run.state.gold >= 500) {
          const f = feats.earn('rich');
          if (f) run.message(`Feat earned: ${f.name}!`);
        }
        lastEvents.push({ type: 'harvest', plot, gained, combo: run.state.combo });
      }
    }
  }
  function strikeAt(x, y) {
    if (run.state.charge < mods.strikeCost) {
      run.message('Lightning not charged yet — steer a storm cloud over the vale.');
      return false;
    }
    run.state.charge -= mods.strikeCost;
    run.state.strikes += 1;
    const events = [];
    const cleared = blight.strike(x, y, field, events);
    run.state.blightsCleared += cleared;
    if (cleared > 0) {
      const f = feats.earn('first-storm');
      if (f) run.message(`Feat earned: ${f.name}!`);
      run.message(`Lightning cleansed ${cleared} blighted plot${cleared > 1 ? 's' : ''}!`);
    }
    lastEvents.push({ type: 'strike', x, y, cleared });
    return true;
  }
  function strikeNearestStorm() {
    const storms = clouds.list().filter((c) => c.kind === 'storm');
    if (storms.length === 0) { run.message('No storm cloud in the sky to strike from.'); return false; }
    const s = storms[0];
    return strikeAt(s.x, s.y + 60);
  }
  // Demo mode: the title screen's living valley behind the menu.
  function stepDemo(dt) {
    if (phase !== 'title') return;
    wind.step(dt);
    clouds.step(dt, wind, mods, null);
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = 3.5;
      clouds.spawn(clouds.pickKind(seasonDef(0).clouds, 1), undefined, undefined);
      const spawned = clouds.list()[clouds.list().length - 1];
      if (spawned) spawned.dir = 1;
    }
    const events = [];
    field.step(dt, mods, 0.4, events);
  }
  function resetDemo() {
    phase = 'title';
    wind.clear(); clouds.clear(); blight.reset();
    field.reset(false);
    spawnTimer = 0.5;
  }
  return {
    step, stepDemo, startRun, pickCharm, strikeAt, strikeNearestStorm,
    handleClick, resetDemo, attachRun,
    wind, clouds, field, blight, charms, feats,
    phase() { return phase; },
    setPhase(p) { phase = p; },
    difficultyKey() { return difficultyKey; },
    difficulty() { return difficulty; },
    mods() { return mods; },
    quota() { return quota; },
    seasonTimer() { return Math.max(0, seasonTimer); },
    forecast() { return forecast; },
    victory() { return victory; },
    defeat() { return defeat; },
    lastEvents() { return lastEvents; },
    seasonBlighted() { return seasonBlighted; },
    seasonWithered() { return seasonWithered; },
    random,
  };
}
