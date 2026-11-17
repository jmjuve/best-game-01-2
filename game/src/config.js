// STORMWRIGHT — configuration: the whole game's tuning in one place.
// The valley is a fixed virtual stage, 1280 by 480, scaled to the canvas.
// Every number below was chosen so a first-time player can finish season 1
// and a careful player can chase an S grade on Tempest.
export const STAGE = { width: 1280, height: 480 };
export const HUD_H = 46;
export const VALLEY = { x: 24, y: 52, width: 856, height: 372 };
export const SKY = { x: 24, y: 52, width: 856, height: 128 };
export const FIELD = { x: 24, y: 188, width: 856, height: 236 };
export const SIDEBAR = { x: 896, y: 52, width: 360, height: 372 };
export const STEP = 1 / 60;

export const SEASON_LENGTH = 75;
export const SEASON_COUNT = 6;
export const SEASON_NAMES = ['Spring Thaw', 'First Rain', 'High Sun', 'Storm Season', 'Ember Autumn', 'Long Winter'];

// One season's weather personality: which clouds the sky brings, how thirsty
// the soil gets, how often blight wakes, and how much harvest the vale demands.
export const SEASONS = [
  { name: 'Spring Thaw', quota: 90, drought: 0.55, blight: 0.10, clouds: { rain: 0.62, storm: 0.10, snow: 0.18, ember: 0.10 }, spawnEvery: 4.2, tint: '#7ec8e3' },
  { name: 'First Rain', quota: 130, drought: 0.65, blight: 0.14, clouds: { rain: 0.58, storm: 0.16, snow: 0.10, ember: 0.16 }, spawnEvery: 3.8, tint: '#6fb7d9' },
  { name: 'High Sun', quota: 180, drought: 0.85, blight: 0.18, clouds: { rain: 0.44, storm: 0.18, snow: 0.06, ember: 0.32 }, spawnEvery: 3.5, tint: '#f2c14e' },
  { name: 'Storm Season', quota: 230, drought: 0.70, blight: 0.24, clouds: { rain: 0.42, storm: 0.34, snow: 0.08, ember: 0.16 }, spawnEvery: 3.0, tint: '#8a7fd6' },
  { name: 'Ember Autumn', quota: 280, drought: 0.95, blight: 0.30, clouds: { rain: 0.34, storm: 0.22, snow: 0.10, ember: 0.34 }, spawnEvery: 2.8, tint: '#e07840' },
  { name: 'Long Winter', quota: 340, drought: 0.60, blight: 0.36, clouds: { rain: 0.30, storm: 0.26, snow: 0.30, ember: 0.14 }, spawnEvery: 2.6, tint: '#a8c8e8' },
];

export const DIFFICULTIES = {
  gentle: { label: 'Gentle Breeze', quotaMul: 0.75, blightMul: 0.6, droughtMul: 0.7, inkRegen: 26, inkMax: 120, spawnMul: 1.25, desc: 'Slow skies, kind soil. Learn the winds.' },
  steady: { label: 'Steady Gale', quotaMul: 1.0, blightMul: 1.0, droughtMul: 1.0, inkRegen: 20, inkMax: 100, spawnMul: 1.0, desc: 'The intended storm. Fair winds, real blight.' },
  tempest: { label: 'Tempest', quotaMul: 1.35, blightMul: 1.6, droughtMul: 1.3, inkRegen: 15, inkMax: 85, spawnMul: 0.8, desc: 'Hungry quotas, furious blight. For master wrights.' },
};
export const DIFFICULTY_KEYS = ['gentle', 'steady', 'tempest'];

// Crops: what each needs, what it pays, and how it looks at each growth stage.
export const CROPS = {
  wheat: { name: 'Wheat', value: 12, waterNeed: 34, sunNeed: 26, growTime: 14, colour: '#e8c85a', sprout: '#7fbf5a', desc: 'Quick and thirsty. The vale staple.' },
  pumpkin: { name: 'Pumpkin', value: 26, waterNeed: 55, sunNeed: 40, growTime: 22, colour: '#e07828', sprout: '#5da24a', desc: 'Slow, heavy, worth the wait.' },
  berry: { name: 'Berry', value: 20, waterNeed: 44, sunNeed: 18, growTime: 17, colour: '#c94f7c', sprout: '#6fae4e', desc: 'Loves rain, fears the sun.' },
  moonmelon: { name: 'Moonmelon', value: 42, waterNeed: 70, sunNeed: 55, growTime: 28, colour: '#7fd6c2', sprout: '#4e9e8a', desc: 'Rare. Drinks deep, ripens under ember light.' },
};
export const CROP_KEYS = ['wheat', 'pumpkin', 'berry', 'moonmelon'];
export const FIELD_COLS = 8;
export const FIELD_ROWS = 4;

// Clouds: the four weathers a wright can steer. Rain waters, storm waters and
// charges lightning, snow waters slowly and kills blight, ember ripens fast
// but dries the soil and can scorch a dry crop.
export const CLOUDS = {
  rain: { name: 'Raincloud', colour: '#5f7fa8', dark: '#3e5a7d', rain: 26, sun: 0, charge: 0, speed: 26, life: 26, desc: 'Steady rain. Waters the plots beneath it.' },
  storm: { name: 'Stormcloud', colour: '#6a5f9e', dark: '#463d73', rain: 20, sun: 0, charge: 34, speed: 34, life: 22, desc: 'Rain plus lightning. Click it to strike blight.' },
  snow: { name: 'Snowcloud', colour: '#dfe9f5', dark: '#aebfd6', rain: 12, sun: 0, charge: 0, speed: 18, life: 30, desc: 'Gentle snow. Waters slowly, freezes blight.' },
  ember: { name: 'Embercloud', colour: '#e07840', dark: '#a34d22', rain: -14, sun: 46, charge: 0, speed: 30, life: 20, desc: 'Warm ember light. Ripens crops, dries soil.' },
};
export const CLOUD_KEYS = ['rain', 'storm', 'snow', 'ember'];

export const WIND = { maxLanes: 3, laneLife: 9, pull: 150, radius: 64, inkPerPx: 0.08, minLen: 26 };

// Lightning: what a strike does, and what it costs.
export const STRIKE = { cost: 100, clearRadius: 74, blightClear: true, harvestBonus: 0 };

// Charms: the draft between seasons. Pick one of three; each changes the run.
export const CHARMS = [
  { id: 'deep-roots', name: 'Deep Roots', icon: '🌱', desc: 'Soil holds water 40% longer.', apply: (m) => { m.waterHold *= 1.4; } },
  { id: 'sun-catcher', name: 'Sun Catcher', icon: '☀️', desc: 'Ember light ripens crops 35% faster.', apply: (m) => { m.sunMul *= 1.35; } },
  { id: 'gale-ink', name: 'Gale Ink', icon: '🌬️', desc: '+40 wind ink and +30% ink regeneration.', apply: (m) => { m.inkMax += 40; m.inkRegen *= 1.3; } },
  { id: 'storm-rod', name: 'Storm Rod', icon: '⚡', desc: 'Lightning charges 50% faster, strikes cost 25 less.', apply: (m) => { m.chargeMul *= 1.5; m.strikeCost -= 25; } },
  { id: 'snowfall', name: 'Snowfall', icon: '❄️', desc: 'Snow clouds appear twice as often.', apply: (m) => { m.snowMul *= 2; } },
  { id: 'golden-scythe', name: 'Golden Scythe', icon: '🌾', desc: 'Every harvest pays +35% gold.', apply: (m) => { m.valueMul *= 1.35; } },
  { id: 'rain-dancer', name: 'Rain Dancer', icon: '💧', desc: 'Rain clouds drift 40% slower and live longer.', apply: (m) => { m.rainSlow *= 0.6; m.rainLife *= 1.3; } },
  { id: 'blight-ward', name: 'Blight Ward', icon: '🛡️', desc: 'Blight spreads 50% slower and wakes half as often.', apply: (m) => { m.blightMul *= 0.5; } },
  { id: 'ember-heart', name: 'Ember Heart', icon: '🔥', desc: 'Ember clouds never scorch, and ripen 25% faster.', apply: (m) => { m.noScorch = true; m.sunMul *= 1.25; } },
  { id: 'moon-seeds', name: 'Moonmelon Seeds', icon: '🌙', desc: 'Moonmelons sprout in empty plots and pay +20 gold.', apply: (m) => { m.moonBonus += 20; m.moonSeeds = true; } },
  { id: 'swift-winds', name: 'Swift Winds', icon: '🌀', desc: 'Wind lanes pull clouds 45% harder.', apply: (m) => { m.windMul *= 1.45; } },
  { id: 'bumper-charm', name: 'Bumper Charm', icon: '🍀', desc: 'Harvest combos last twice as long.', apply: (m) => { m.comboWindow *= 2; } },
];

export const GRADES = [
  { min: 5200, grade: 'S', title: 'Stormwright Supreme' },
  { min: 3800, grade: 'A', title: 'Master of the Vale' },
  { min: 2600, grade: 'B', title: 'Seasoned Wright' },
  { min: 1500, grade: 'C', title: 'Apprentice Wright' },
  { min: 0, grade: 'D', title: 'Fair-Weather Friend' },
];

export const FEATS = [
  { id: 'first-harvest', name: 'First Harvest', desc: 'Harvest your first crop.' },
  { id: 'first-storm', name: 'First Storm', desc: 'Strike lightning at blight.' },
  { id: 'combo-5', name: 'Fivefold Breeze', desc: 'Reach a 5-harvest combo.' },
  { id: 'combo-10', name: 'Tempest Chain', desc: 'Reach a 10-harvest combo.' },
  { id: 'no-blight', name: 'Spotless Season', desc: 'Finish a season with no blighted plot.' },
  { id: 'over-quota', name: 'Bumper Crop', desc: 'Beat a season quota by 50% or more.' },
  { id: 'wind-artist', name: 'Wind Artist', desc: 'Draw 25 wind lanes in one run.' },
  { id: 'moon-harvest', name: 'Moon Harvest', desc: 'Harvest a moonmelon.' },
  { id: 'rich', name: 'Vale Riches', desc: 'Hold 500 gold at once.' },
  { id: 'perfect-season', name: 'Perfect Season', desc: 'Finish a season with no withered crop.' },
];

export const BEST_KEY = 'stormwright.best.v1';
export const HALL_KEY = 'stormwright.hall.v1';
export const MUTE_KEY = 'stormwright.mute.v1';
