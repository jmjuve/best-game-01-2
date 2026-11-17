// Charms: the between-season draft. Three are offered, the wright picks
// one, and its effect joins the run's modifiers. Modifiers start neutral
// and every charm multiplies or adds to them; the field, clouds and wind
// all read the same object, so a charm's effect is felt everywhere.
import { CHARMS } from './config.js';

export function baseModifiers(difficulty) {
  return {
    waterHold: 1, sunMul: 1, inkMax: difficulty.inkMax, inkRegen: difficulty.inkRegen,
    chargeMul: 1, strikeCost: 100, snowMul: 1, valueMul: 1, rainSlow: 1, rainLife: 1,
    blightMul: 1, noScorch: false, moonBonus: 0, moonSeeds: false, windMul: 1, comboWindow: 4,
  };
}

export function createCharms(random) {
  let owned = [];
  let offered = [];

  function offer() {
    const pool = CHARMS.filter((c) => !owned.some((o) => o.id === c.id));
    offered = random.shuffle(pool).slice(0, 3);
    return offered;
  }
  function pick(index, mods) {
    const charm = offered[index];
    if (!charm) return null;
    charm.apply(mods);
    owned.push(charm);
    offered = [];
    return charm;
  }
  function reset() { owned = []; offered = []; }
  return {
    offer, pick, reset,
    owned() { return owned; },
    offered() { return offered; },
    all() { return CHARMS; },
  };
}
