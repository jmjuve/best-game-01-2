// Seasons and feats: the run's spine. Six seasons, each with its own
// quota, weather and temper; finishing one opens the charm draft, and
// finishing all six ends the run in victory. Feats are the run's honours,
// earned once and shown on the victory screen.
import { SEASONS, SEASON_COUNT, SEASON_LENGTH, FEATS, GRADES } from './config.js';

export function seasonDef(index) {
  return SEASONS[Math.min(index, SEASON_COUNT - 1)];
}
export function seasonQuota(index, difficulty) {
  return Math.round(seasonDef(index).quota * difficulty.quotaMul);
}
export function seasonLength() { return SEASON_LENGTH; }
export function seasonCount() { return SEASON_COUNT; }
export function seasonName(index) { return seasonDef(index).name; }

export function createFeats() {
  const earned = new Set();
  function earn(id) {
    if (earned.has(id)) return null;
    earned.add(id);
    return FEATS.find((f) => f.id === id) || null;
  }
  function has(id) { return earned.has(id); }
  function list() { return FEATS.map((f) => ({ ...f, earned: earned.has(f.id) })); }
  function reset() { earned.clear(); }
  return { earn, has, list, reset, count: () => earned.size };
}

export function gradeFor(score) {
  for (const g of GRADES) {
    if (score >= g.min) return g;
  }
  return GRADES[GRADES.length - 1];
}
