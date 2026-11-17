// Run state: everything one play-through owns — score, gold, combo, charge,
// ink, season progress, run statistics and the saved best. The world reads
// and writes this object; the renderer only reads it.
import { BEST_KEY, HALL_KEY } from './config.js';

export function createRunState() {
  const state = {
    score: 0, gold: 0, season: 0, seasonScore: 0, seasonHarvest: 0,
    seasonTime: 0, combo: 0, comboTimer: 0, bestCombo: 0,
    charge: 0, ink: 100, inkMax: 100,
    harvests: 0, strikes: 0, blightsCleared: 0, lanesDrawn: 0,
    withered: 0, blightedTotal: 0, rainDrops: 0, moonHarvests: 0,
    seasonsCleared: 0, totalScore: 0, messages: [],
  };
  function reset(difficulty) {
    state.score = 0; state.gold = 0; state.season = 0; state.seasonScore = 0;
    state.seasonHarvest = 0; state.seasonTime = 0; state.combo = 0;
    state.comboTimer = 0; state.bestCombo = 0; state.charge = 0;
    state.ink = difficulty.inkMax; state.inkMax = difficulty.inkMax;
    state.harvests = 0; state.strikes = 0; state.blightsCleared = 0;
    state.lanesDrawn = 0; state.withered = 0; state.blightedTotal = 0;
    state.rainDrops = 0; state.moonHarvests = 0; state.seasonsCleared = 0;
    state.totalScore = 0; state.messages = [];
  }
  function addScore(n) { state.score += n; state.seasonScore += n; state.totalScore += n; }
  function addGold(n) { state.gold += n; }
  function harvest(value, kind) {
    state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
    state.comboTimer = 4;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    const bonus = value * (1 + Math.min(state.combo - 1, 10) * 0.15);
    const gained = Math.round(bonus);
    addScore(gained);
    addGold(value);
    state.harvests += 1;
    state.seasonHarvest += value;
    if (kind === 'moonmelon') state.moonHarvests += 1;
    return gained;
  }
  function tickCombo(dt) {
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
  }
  function message(text) {
    state.messages.unshift({ text, t: Date.now() });
    if (state.messages.length > 4) state.messages.length = 4;
  }
  function readBest() {
    try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; }
    catch { return 0; }
  }
  function saveBest() {
    try {
      if (state.score > readBest()) window.localStorage.setItem(BEST_KEY, String(state.score));
    } catch { /* storage may be off; best then lasts this visit only */ }
  }
  function readHall() {
    try {
      const raw = window.localStorage.getItem(HALL_KEY);
      if (!raw) return { runs: 0, bestGrade: '—', bestSeason: 0 };
      return JSON.parse(raw);
    } catch { return { runs: 0, bestGrade: '—', bestSeason: 0 }; }
  }
  function saveHall(grade, seasonsCleared) {
    try {
      const hall = readHall();
      hall.runs += 1;
      const order = ['D', 'C', 'B', 'A', 'S'];
      if (order.indexOf(grade) > order.indexOf(hall.bestGrade)) hall.bestGrade = grade;
      hall.bestSeason = Math.max(hall.bestSeason, seasonsCleared);
      window.localStorage.setItem(HALL_KEY, JSON.stringify(hall));
      return hall;
    } catch { return readHall(); }
  }
  return {
    state, reset, addScore, addGold, harvest, tickCombo, message,
    readBest, saveBest, readHall, saveHall,
  };
}
