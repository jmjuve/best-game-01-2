// Boot and the one loop for Stormwright: input is read every frame, the
// world advances in fixed 1/60 s steps, and the renderer paints what is
// there. Screens: title, play, draft, paused, victory, defeat.
// ?seed=N fixes the forecast. ?shot=start|play|draft|end stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady.
import { BEST_KEY, MUTE_KEY, STEP, DIFFICULTY_KEYS } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE, ACTION_STRIKE } from './input.js';
import { createWorld, EVENT_OVER, EVENT_SEASON_CLEAR } from './world.js';
import { createRunState } from './state.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_DRAFT, SCREEN_PAUSED, SCREEN_VICTORY, SCREEN_DEFEAT } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const runState = createRunState();
const renderer = createRenderer(canvas);
const audio = createAudio();
world.attachRun(runState);

function readMuted() {
  try { return window.localStorage.getItem(MUTE_KEY) === '1'; }
  catch { return false; }
}
function saveMuted(value) {
  try { window.localStorage.setItem(MUTE_KEY, value ? '1' : '0'); } catch { /* ignore */ }
}
let muted = readMuted();
audio.setMuted(muted);

function runShot(name) {
  const scene = stageShot(name, world, runState);
  const hall = runState.readHall();
  let painted = 0;
  function paint() {
    renderer.draw(world, runState, scene.screen, scene.best, hall, 'steady', muted, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = runState.readBest();
  let hall = runState.readHall();
  let selectedDiff = 'steady';
  let diffIndex = 1;
  let diffKeyHeld = false;
  let accumulator = 0;
  let last = performance.now();
  let rainSoundTimer = 0;

  function announce(message) { status.textContent = message; }

  function startGame() {
    audio.unlock();
    world.startRun(selectedDiff, runState);
    screen = SCREEN_PLAY;
    announce(`Playing. Season 1: meet the quota before the clock runs out.`);
  }
  function backToTitle() {
    world.resetDemo();
    screen = SCREEN_TITLE;
    best = runState.readBest();
    hall = runState.readHall();
    announce('Stormwright. Press Space or click to start.');
  }
  function handleTitleKeys(actions) {
    if (actions & ACTION_CONFIRM) { startGame(); return; }
    const left = input.hasKey('ArrowLeft') || input.hasKey('ArrowUp');
    const right = input.hasKey('ArrowRight') || input.hasKey('ArrowDown');
    if ((left || right) && !diffKeyHeld) {
      diffKeyHeld = true;
      diffIndex = (diffIndex + (left ? DIFFICULTY_KEYS.length - 1 : 1)) % DIFFICULTY_KEYS.length;
      selectedDiff = DIFFICULTY_KEYS[diffIndex];
      audio.click();
    }
    if (!left && !right) diffKeyHeld = false;
  }
  function handleDraftClick(p) {
    // The three charm cards sit in a row; a click on one picks it.
    const offered = world.charms.offered();
    for (let i = 0; i < offered.length; i += 1) {
      const x = 220 + i * 300;
      if (p.x >= x && p.x <= x + 280 && p.y >= 168 && p.y <= 318) {
        audio.charm();
        world.pickCharm(i);
        screen = world.phase() === 'victory' ? SCREEN_VICTORY : SCREEN_PLAY;
        if (screen === SCREEN_VICTORY) { audio.victory(); best = runState.readBest(); hall = runState.readHall(); }
        else announce(`Season ${runState.state.season + 1} begins.`);
        return true;
      }
    }
    return false;
  }
  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      muted = !muted;
      audio.setMuted(muted);
      saveMuted(muted);
    }
    if (screen === SCREEN_TITLE) { handleTitleKeys(actions); return; }
    if (screen === SCREEN_VICTORY || screen === SCREEN_DEFEAT) {
      if (actions & ACTION_CONFIRM) backToTitle();
      return;
    }
    if (screen === SCREEN_DRAFT) {
      if (input.hasKey('Digit1')) { world.pickCharm(0); screen = world.phase() === 'victory' ? SCREEN_VICTORY : SCREEN_PLAY; }
      else if (input.hasKey('Digit2')) { world.pickCharm(1); screen = world.phase() === 'victory' ? SCREEN_VICTORY : SCREEN_PLAY; }
      else if (input.hasKey('Digit3')) { world.pickCharm(2); screen = world.phase() === 'victory' ? SCREEN_VICTORY : SCREEN_PLAY; }
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }
  function step() {
    if (screen === SCREEN_TITLE) {
      world.stepDemo(STEP);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const stroke = input.takeStroke();
    const click = input.takeClick();
    const events = world.step(STEP, stroke, click, false);
    for (const e of world.lastEvents()) {
      if (e.type === 'harvest') {
        audio.harvest(e.combo || 1);
        renderer.burst(e.plot.x + e.plot.w / 2, e.plot.y + e.plot.h / 2, '#ffd76a', 10);
      }
      if (e.type === 'strike') audio.thunder();
      if (e.type === 'blight') audio.blight();
      if (e.type === 'wither') audio.wither();
    }
    if (events & EVENT_SEASON_CLEAR) {
      audio.seasonClear();
      screen = SCREEN_DRAFT;
      announce('Season cleared. Draft a charm.');
    } else if (events & EVENT_OVER) {
      if (world.phase() === 'victory') { audio.victory(); screen = SCREEN_VICTORY; }
      else { audio.seasonFail(); screen = SCREEN_DEFEAT; }
      best = runState.readBest();
      hall = runState.readHall();
      announce(screen === SCREEN_VICTORY ? 'Victory! The vale is fed.' : 'Season failed.');
    }
    rainSoundTimer -= STEP;
    if (rainSoundTimer <= 0 && world.clouds.list().some((c) => c.kind === 'rain' || c.kind === 'storm')) {
      audio.rainTick();
      rainSoundTimer = 0.7;
    }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // Clicks on screens that need them (title start, draft pick, restart).
    // Play-screen clicks are left for step() to consume (harvest / strike).
    const click = screen === SCREEN_PLAY ? null : input.takeClick();
    if (click && (screen === SCREEN_TITLE || screen === SCREEN_VICTORY || screen === SCREEN_DEFEAT)) {
      audio.unlock();
      if (screen === SCREEN_TITLE) {
        // Difficulty cards on the title screen.
        let picked = false;
        ['gentle', 'steady', 'tempest'].forEach((key, i) => {
          const x = 220 + i * 300;
          if (click.x >= x && click.x <= x + 280 && click.y >= 290 && click.y <= 352) {
            selectedDiff = key; diffIndex = i; picked = true;
          }
        });
        if (!picked) startGame();
      } else backToTitle();
    } else if (click && screen === SCREEN_DRAFT) {
      handleDraftClick(click);
    }
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, runState, screen, best, hall, selectedDiff, muted, STEP);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });
  canvas.addEventListener('pointerdown', () => audio.unlock(), { once: false });
  // Test hook: live state for automated play-testing (read-only state view
  // plus the world's own methods; the game itself never calls this).
  window.__storm = {
    world, run: runState,
    screen: () => screen,
    state: () => ({
      screen, score: runState.state.score, gold: runState.state.gold,
      season: runState.state.season, seasonHarvest: runState.state.seasonHarvest,
      quota: world.quota(), charge: runState.state.charge,
      ink: runState.state.ink, combo: runState.state.combo,
      harvests: runState.state.harvests, strikes: runState.state.strikes,
      blightsCleared: runState.state.blightsCleared,
      lanes: runState.state.lanesDrawn, clouds: world.clouds.list().length,
      field: world.field.counts(), phase: world.phase(),
    }),
  };

  announce('Stormwright. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
