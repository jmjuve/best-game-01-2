// Renderer: every pixel of Stormwright. One canvas, one virtual stage of
// 1280 by 480, scaled to fit. It paints the valley (sky, hills, field),
// the weather (clouds, rain, wind lanes, lightning), the HUD (quota, gold,
// score, combo, ink, charge), the sidebar (forecast, charms, controls) and
// every screen: title, draft, pause, victory and defeat.
import { STAGE, HUD_H, VALLEY, SKY, FIELD, SIDEBAR, CLOUDS, CROPS, SEASON_COUNT } from './config.js';
import { seasonDef, seasonQuota } from './seasons.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_DRAFT = 'draft';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_VICTORY = 'victory';
export const SCREEN_DEFEAT = 'defeat';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let particles = [];

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || STAGE.width;
    const h = canvas.clientHeight || STAGE.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const scale = Math.min(canvas.width / STAGE.width, canvas.height / STAGE.height);
    ctx.setTransform(scale, 0, 0, scale, (canvas.width - STAGE.width * scale) / 2, (canvas.height - STAGE.height * scale) / 2);
  }
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function text(str, x, y, size, colour, align, weight) {
    ctx.fillStyle = colour;
    ctx.font = `${weight || 700} ${size}px system-ui, sans-serif`;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }
  function bar(x, y, w, h, frac, fill, bg) {
    ctx.fillStyle = bg || 'rgba(0,0,0,0.35)';
    rr(x, y, w, h, h / 2); ctx.fill();
    if (frac > 0) {
      ctx.fillStyle = fill;
      rr(x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2); ctx.fill();
    }
  }
  function addParticles(list) { particles.push(...list); }

  function drawSky(world, run) {
    const def = seasonDef(run.state.season);
    const g = ctx.createLinearGradient(0, 0, 0, STAGE.height);
    g.addColorStop(0, def.tint);
    g.addColorStop(0.45, '#cfe8d8');
    g.addColorStop(1, '#8fae7a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);
    // Sun and distant hills.
    ctx.fillStyle = 'rgba(255,244,200,0.95)';
    ctx.beginPath(); ctx.arc(1180, 78, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,244,200,0.35)';
    ctx.beginPath(); ctx.arc(1180, 78, 40, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a9e6a';
    ctx.beginPath();
    ctx.moveTo(0, 190);
    ctx.quadraticCurveTo(220, 130, 460, 182);
    ctx.quadraticCurveTo(700, 226, 900, 172);
    ctx.quadraticCurveTo(1120, 130, 1280, 180);
    ctx.lineTo(1280, 480); ctx.lineTo(0, 480); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6d915e';
    ctx.beginPath();
    ctx.moveTo(0, 210);
    ctx.quadraticCurveTo(300, 168, 620, 204);
    ctx.quadraticCurveTo(940, 236, 1280, 196);
    ctx.lineTo(1280, 480); ctx.lineTo(0, 480); ctx.closePath(); ctx.fill();
  }
  function drawWindLanes(world) {
    for (const lane of world.wind.lanes()) {
      const alpha = Math.min(1, lane.life / (lane.maxLife * 0.5)) * 0.85;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      lane.nodes.forEach((n, i) => { if (i === 0) ctx.moveTo(n.x, n.y); else ctx.lineTo(n.x, n.y); });
      ctx.stroke();
      ctx.strokeStyle = `rgba(80,160,220,${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Arrowheads along the lane.
      for (let i = 6; i < lane.nodes.length; i += 8) {
        const a = lane.nodes[i - 2]; const b = lane.nodes[i];
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(b.x + Math.cos(ang) * 9, b.y + Math.sin(ang) * 9);
        ctx.lineTo(b.x + Math.cos(ang + 2.5) * 8, b.y + Math.sin(ang + 2.5) * 8);
        ctx.lineTo(b.x + Math.cos(ang - 2.5) * 8, b.y + Math.sin(ang - 2.5) * 8);
        ctx.closePath(); ctx.fill();
      }
    }
  }
  function drawCloud(cloud) {
    const def = cloud.def;
    const s = cloud.size;
    const fade = Math.min(1, cloud.life / 3);
    ctx.globalAlpha = fade;
    ctx.fillStyle = def.dark;
    ctx.beginPath(); ctx.ellipse(cloud.x, cloud.y + 10 * s, 52 * s, 16 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.colour;
    for (const [dx, dy, r] of [[-30, 4, 20], [-8, -8, 26], [16, -4, 22], [34, 6, 16]]) {
      ctx.beginPath(); ctx.arc(cloud.x + dx * s, cloud.y + dy * s, r * s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Rain streaks under rain and storm clouds; embers under ember clouds.
    if (cloud.kind === 'rain' || cloud.kind === 'storm') {
      ctx.strokeStyle = 'rgba(120,170,230,0.7)';
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i += 1) {
        const rx = cloud.x + i * 18 * s;
        ctx.beginPath(); ctx.moveTo(rx, cloud.y + 18); ctx.lineTo(rx - 4, cloud.y + 44); ctx.stroke();
      }
    }
    if (cloud.kind === 'ember') {
      ctx.fillStyle = 'rgba(255,180,80,0.9)';
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath(); ctx.arc(cloud.x + i * 16 * s, cloud.y + 26 + (i % 2) * 8, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (cloud.kind === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath(); ctx.arc(cloud.x + i * 16 * s, cloud.y + 24 + (i % 2) * 7, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (cloud.kind === 'storm') {
      text('⚡', cloud.x - 4, cloud.y - 2, 22, '#ffe95e', 'center');
    }
  }
  function drawBolts(world) {
    for (const b of world.blight.bolts()) {
      const a = b.life / b.maxLife;
      ctx.strokeStyle = `rgba(255,233,94,${a})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y - 90);
      ctx.lineTo(b.x - 10, b.y - 55); ctx.lineTo(b.x + 8, b.y - 30); ctx.lineTo(b.x - 4, b.y);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${a * 0.5})`;
      ctx.beginPath(); ctx.arc(b.x, b.y, 26 * a + 6, 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawField(world) {
    ctx.fillStyle = 'rgba(40,60,30,0.55)';
    rr(FIELD.x - 6, FIELD.y - 6, FIELD.width + 12, FIELD.height + 12, 10); ctx.fill();
    for (const p of world.field.plots()) {
      const cx = p.x + p.w / 2; const cy = p.y + p.h / 2;
      ctx.fillStyle = p.blighted ? '#5a3a6e' : p.withered ? '#6e6250' : '#5d4126';
      rr(p.x + 2, p.y + 2, p.w - 4, p.h - 4, 6); ctx.fill();
      ctx.fillStyle = p.blighted ? '#4a2d5c' : p.withered ? '#5d5342' : '#6e4f30';
      rr(p.x + 4, p.y + 4, p.w - 8, p.h - 8, 5); ctx.fill();
      if (!p.blighted && !p.withered) {
        // Water sheen and the growing crop.
        if (p.water > 55) {
          ctx.fillStyle = 'rgba(90,160,230,0.35)';
          rr(p.x + 5, p.y + p.h - 12, p.w - 10, 7, 3); ctx.fill();
        }
        const g = p.growth / 100;
        const h = 6 + g * (p.h * 0.5);
        ctx.strokeStyle = p.def.sprout;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx, p.y + p.h - 8); ctx.lineTo(cx, p.y + p.h - 8 - h); ctx.stroke();
        if (g > 0.25) {
          ctx.fillStyle = p.def.sprout;
          ctx.beginPath(); ctx.ellipse(cx - 7, p.y + p.h - 10 - h * 0.6, 7, 4, -0.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(cx + 7, p.y + p.h - 10 - h * 0.7, 7, 4, 0.5, 0, Math.PI * 2); ctx.fill();
        }
        if (g > 0.6) {
          ctx.fillStyle = p.def.colour;
          ctx.beginPath(); ctx.arc(cx, p.y + p.h - 12 - h, 6 + g * 3, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx - 8, p.y + p.h - 8 - h * 0.8, 4, 0, Math.PI * 2); ctx.fill();
        }
        // Growth and water meters under the plant.
        bar(p.x + 6, p.y + p.h - 6, p.w - 12, 3, g, '#8fd45a');
        bar(p.x + 6, p.y + 4, p.w - 12, 3, p.water / 100, '#5aa8e0');
      }
      if (p.ripe) {
        ctx.strokeStyle = 'rgba(255,220,90,0.95)';
        ctx.lineWidth = 3;
        rr(p.x + 2, p.y + 2, p.w - 4, p.h - 4, 6); ctx.stroke();
        text('✦', cx, p.y + 12, 13, '#ffe95e', 'center');
        text(`${p.def.value}g`, cx, p.y + p.h - 14, 11, '#ffffff', 'center');
      }
      if (p.blighted) {
        text('☠', cx, cy, 22, '#d8a0f0', 'center');
        text('BLIGHT', cx, p.y + p.h - 10, 9, '#e8c8ff', 'center');
      }
      if (p.withered) text('🥀', cx, cy, 18, '#c8b898', 'center');
    }
  }
  function drawParticles(dt) {
    for (const p of particles) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt;
    }
    particles = particles.filter((p) => p.life > 0);
    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life / 0.4);
      ctx.fillStyle = p.colour;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function burst(x, y, colour, n) {
    const list = [];
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * Math.PI * 2;
      list.push({ x, y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60 - 40, life: 0.7, size: 3 + Math.random() * 3, colour });
    }
    addParticles(list);
  }

  function drawHud(world, run, best, muted) {
    ctx.fillStyle = 'rgba(18,32,44,0.92)';
    ctx.fillRect(0, 0, STAGE.width, HUD_H);
    ctx.fillStyle = '#ffd76a';
    text('⛈ STORMWRIGHT', 14, 24, 20, '#ffd76a', 'left');
    const def = seasonDef(run.state.season);
    text(`Season ${run.state.season + 1}/${SEASON_COUNT} · ${def.name}`, 210, 15, 13, '#ffffff', 'left');
    text(`⏱ ${Math.ceil(world.seasonTimer())}s`, 210, 33, 12, '#bfe0ff', 'left');
    const quotaFrac = Math.min(1, run.state.seasonHarvest / Math.max(1, world.quota()));
    text(`QUOTA ${run.state.seasonHarvest}/${world.quota()}g`, 420, 15, 12, '#ffffff', 'left');
    bar(420, 24, 170, 10, quotaFrac, quotaFrac >= 1 ? '#7be07b' : '#ffd76a');
    text(`💰 ${run.state.gold}g`, 620, 24, 16, '#ffd76a', 'left');
    text(`SCORE ${run.state.score}`, 720, 24, 16, '#ffffff', 'left');
    if (run.state.combo > 1) {
      text(`🔥 COMBO ×${run.state.combo}`, 850, 24, 15, '#ff9a5a', 'left');
      bar(850, 34, 90, 5, run.state.comboTimer / 4, '#ff9a5a');
    }
    text(`🌬 INK ${Math.floor(run.state.ink)}/${run.state.inkMax}`, 990, 15, 11, '#bfe0ff', 'left');
    bar(990, 24, 110, 8, run.state.ink / Math.max(1, run.state.inkMax), '#7ec8e3');
    const chargeFrac = run.state.charge / Math.max(1, world.mods().strikeCost);
    text(`⚡ ${Math.floor(run.state.charge)}/${world.mods().strikeCost}`, 1120, 15, 11, '#ffe95e', 'left');
    bar(1120, 24, 110, 8, chargeFrac, chargeFrac >= 1 ? '#ffe95e' : '#8a7fd6');
    text(muted ? '🔇 M' : '🔊 M', 1246, 24, 12, '#cfe0f0', 'right');
    text(`BEST ${best}`, 620, 40, 9, '#9fb8cc', 'left');
  }
  function drawSidebar(world, run) {
    ctx.fillStyle = 'rgba(18,32,44,0.88)';
    rr(SIDEBAR.x, SIDEBAR.y, SIDEBAR.width, SIDEBAR.height, 10); ctx.fill();
    let y = SIDEBAR.y + 18;
    text('🌤 FORECAST — clouds on the way', SIDEBAR.x + 14, y, 12, '#ffd76a', 'left'); y += 22;
    world.forecast().forEach((kind, i) => {
      const def = CLOUDS[kind];
      ctx.fillStyle = def.colour;
      rr(SIDEBAR.x + 14 + i * 86, y, 78, 30, 6); ctx.fill();
      text(def.name, SIDEBAR.x + 53 + i * 86, y + 15, 10, '#ffffff', 'center');
    });
    y += 48;
    text('✦ CHARMS — draft one each season', SIDEBAR.x + 14, y, 12, '#ffd76a', 'left'); y += 20;
    const owned = world.charms.owned();
    if (owned.length === 0) text('None yet — clear a season to draft one.', SIDEBAR.x + 14, y, 11, '#cfe0f0', 'left');
    owned.forEach((c, i) => {
      const row = Math.floor(i / 2); const col = i % 2;
      const cx = SIDEBAR.x + 14 + col * 172; const cy = y + row * 26;
      ctx.fillStyle = 'rgba(255,215,106,0.16)';
      rr(cx, cy, 164, 22, 5); ctx.fill();
      text(`${c.icon} ${c.name}`, cx + 8, cy + 11, 11, '#ffffff', 'left');
    });
    y += Math.max(22, Math.ceil(owned.length / 2) * 26 + 6);
    text('🎯 HOW TO PLAY', SIDEBAR.x + 14, y, 12, '#ffd76a', 'left'); y += 18;
    const tips = [
      'Drag to draw WIND — steer clouds over dry fields.',
      'Rain waters · Ember ripens · Snow kills blight.',
      'Click a ripe crop (✦) to harvest for gold.',
      'Click a STORM cloud to strike blight with ⚡.',
      'Meet the quota before the season clock runs out.',
      'Keys: drag = wind · click = harvest/strike · P pause · M mute · L strike.',
    ];
    for (const t of tips) { text('• ' + t, SIDEBAR.x + 14, y, 10.5, '#d8e6f2', 'left'); y += 16; }
    y += 8;
    const counts = world.field.counts();
    text(`FIELD  🌱 growing ${counts.growing} · ✦ ripe ${counts.ripe} · ☠ blight ${counts.blighted} · 🥀 withered ${counts.withered}`, SIDEBAR.x + 14, y, 11, '#ffffff', 'left');
    y += 22;
    text('CROPS  🌾 Wheat 12g · 🎃 Pumpkin 26g · 🫐 Berry 20g · 🌙 Moonmelon 42g', SIDEBAR.x + 14, y, 10, '#bfe0ff', 'left');
    y += 18;
    const msg = run.state.messages[0];
    if (msg) text('» ' + msg.text, SIDEBAR.x + 14, y, 11, '#ffe95e', 'left');
  }
  function drawFooter(world, run) {
    const diff = world.difficulty();
    text(`Difficulty: ${diff.label}  ·  Feats ${world.feats.count()}/10  ·  Wind lanes drawn ${run.state.lanesDrawn}  ·  Strikes ${run.state.strikes}  ·  Blight cleansed ${run.state.blightsCleared}`, 24, 462, 11, '#e8f2e0', 'left');
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(14,26,38,0.94)';
    rr(x, y, w, h, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,106,0.55)';
    ctx.lineWidth = 2;
    rr(x, y, w, h, 14); ctx.stroke();
  }
  function drawTitle(world, run, best, hall, selectedDiff) {
    panel(180, 30, 920, 420);
    text('⛈ STORMWRIGHT', 640, 66, 44, '#ffd76a', 'center');
    text('Weatherwright of the Vale — draw the wind, steer the storms, feed the valley.', 640, 98, 14, '#d8e6f2', 'center');
    // Goal / Win / Lose, plainly stated.
    text('GOAL  Draw wind lanes to steer rain, storm, snow and ember clouds over your fields.', 220, 128, 13, '#ffffff', 'left');
    text('WIN  Meet every season quota, draft charms, and finish all 6 seasons for the best grade.', 220, 148, 13, '#ffffff', 'left');
    text('LOSE  If the season clock runs out before the quota is met, the run ends.', 220, 168, 13, '#ff9a8a', 'left');
    // Three-step illustrated how-to.
    const steps = [
      ['1 · DRAW WIND', 'Drag across the sky. Clouds follow your lanes.'],
      ['2 · FEED THE FIELDS', 'Rain waters, ember ripens, snow kills blight.'],
      ['3 · HARVEST & STRIKE', 'Click ripe ✦ crops for gold; click ⚡ storms to smite blight.'],
    ];
    steps.forEach((s, i) => {
      const x = 220 + i * 300;
      ctx.fillStyle = 'rgba(126,200,227,0.18)';
      rr(x, 188, 280, 64, 8); ctx.fill();
      text(s[0], x + 12, 208, 12, '#ffd76a', 'left');
      text(s[1], x + 12, 230, 11, '#e8f2fa', 'left');
    });
    // Difficulty picker.
    text('CHOOSE YOUR WIND', 220, 278, 12, '#ffd76a', 'left');
    ['gentle', 'steady', 'tempest'].forEach((key, i) => {
      const d = { gentle: null, steady: null, tempest: null };
      const diff = world.difficultyKey() === key ? null : null;
      const x = 220 + i * 300;
      const isSel = selectedDiff === key;
      ctx.fillStyle = isSel ? 'rgba(255,215,106,0.3)' : 'rgba(255,255,255,0.07)';
      rr(x, 290, 280, 62, 8); ctx.fill();
      if (isSel) { ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2; rr(x, 290, 280, 62, 8); ctx.stroke(); }
      const label = key === 'gentle' ? 'Gentle Breeze' : key === 'steady' ? 'Steady Gale' : 'Tempest';
      const desc = key === 'gentle' ? 'Slow skies, kind soil.' : key === 'steady' ? 'The intended storm.' : 'Hungry quotas, furious blight.';
      text((isSel ? '▶ ' : '') + label, x + 12, 310, 13, '#ffffff', 'left');
      text(desc, x + 12, 330, 11, '#cfe0f0', 'left');
    });
    text('Press SPACE or click to start  ·  Drag = wind  ·  Click = harvest / strike  ·  P pause  ·  M mute', 640, 372, 12, '#ffffff', 'center');
    text(`BEST SCORE ${best}   ·   RUNS PLAYED ${hall.runs}   ·   BEST GRADE ${hall.bestGrade}   ·   BEST SEASON ${hall.bestSeason}/6`, 640, 398, 12, '#ffd76a', 'center');
    text('6 seasons · 4 clouds · 4 crops · 12 charms · 10 feats · grades S–D', 640, 424, 11, '#9fb8cc', 'center');
  }
  function drawDraft(world, run) {
    panel(180, 60, 920, 340);
    text('🌟 SEASON CLEARED!', 640, 96, 30, '#ffd76a', 'center');
    text(`Season ${run.state.season + 1} quota met — ${run.state.seasonHarvest}g harvested, score ${run.state.score}.`, 640, 124, 13, '#ffffff', 'center');
    text(`Next: ${seasonDef(Math.min(run.state.season + 1, SEASON_COUNT - 1)).name} — quota ${seasonQuota(Math.min(run.state.season + 1, SEASON_COUNT - 1), world.difficulty())}g. Draft one charm:`, 640, 146, 12, '#d8e6f2', 'center');
    world.charms.offered().forEach((c, i) => {
      const x = 220 + i * 300;
      ctx.fillStyle = 'rgba(255,215,106,0.14)';
      rr(x, 168, 280, 150, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(255,215,106,0.5)'; ctx.lineWidth = 2;
      rr(x, 168, 280, 150, 10); ctx.stroke();
      text(c.icon, x + 140, 210, 40, '#ffffff', 'center');
      text(c.name, x + 140, 248, 15, '#ffd76a', 'center');
      text(c.desc, x + 140, 276, 11, '#e8f2fa', 'center');
      text(`Press ${i + 1} or click`, x + 140, 302, 11, '#9fb8cc', 'center');
    });
    text('Charms stay for the whole run — choose the wind you need next.', 640, 348, 12, '#ffffff', 'center');
    text(`Feats earned ${world.feats.count()}/10  ·  Score ${run.state.score}  ·  Gold ${run.state.gold}g`, 640, 372, 12, '#ffd76a', 'center');
  }
  function drawPaused(world, run) {
    panel(380, 140, 520, 180);
    text('⏸ PAUSED', 640, 180, 30, '#ffd76a', 'center');
    text('The clouds wait for you.', 640, 212, 13, '#d8e6f2', 'center');
    text('P / Space / click to resume  ·  M to mute', 640, 244, 12, '#ffffff', 'center');
    text(`Season ${run.state.season + 1} · Score ${run.state.score} · Quota ${run.state.seasonHarvest}/${world.quota()}g`, 640, 276, 12, '#ffd76a', 'center');
  }
  function statGrid(v, x, y) {
    const stats = [
      ['SCORE', String(v.score)], ['GOLD', `${v.gold}g`], ['HARVESTS', String(v.harvests)],
      ['BEST COMBO', `×${v.bestCombo}`], ['STRIKES', String(v.strikes)], ['WIND LANES', String(v.lanes)],
      ['SEASONS', `${v.seasons}/6`], ['FEATS', `${v.feats.length}/10`],
    ];
    stats.forEach((s, i) => {
      const cx = x + (i % 4) * 200; const cy = y + Math.floor(i / 4) * 52;
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      rr(cx, cy, 185, 44, 8); ctx.fill();
      text(s[0], cx + 12, cy + 14, 10, '#9fb8cc', 'left');
      text(s[1], cx + 12, cy + 31, 16, '#ffffff', 'left');
    });
  }
  function drawVictory(world, run, best) {
    const v = world.victory();
    panel(150, 24, 980, 432);
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(640, 92, 46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2c00';
    text(v.grade, 640, 94, 44, '#3a2c00', 'center');
    text(`🏆 ${v.title} — THE VALE IS FED!`, 640, 152, 24, '#ffd76a', 'center');
    text(`All 6 seasons cleared on ${v.difficulty}. The valley feasts because you steered the sky.`, 640, 178, 13, '#d8e6f2', 'center');
    statGrid(v, 205, 200);
    text('FEATS EARNED', 205, 322, 12, '#ffd76a', 'left');
    const names = v.feats.length > 0 ? v.feats.map((f) => f.name).join('  ·  ') : 'None this run — the wind owes you another try.';
    text(names, 205, 342, 12, '#ffffff', 'left');
    text(`BEST SCORE ${best}  ·  This run ${v.score}`, 640, 380, 13, '#ffd76a', 'center');
    text('Press SPACE or click to play again  ·  The next run brings a new forecast', 640, 408, 12, '#ffffff', 'center');
  }
  function drawDefeat(world, run, best) {
    const d = world.defeat();
    panel(180, 60, 920, 340);
    text('🥀 THE SEASON FAILED', 640, 104, 30, '#ff9a8a', 'center');
    text(`${d.seasonName} (season ${d.season}) ended ${d.harvested}g short of its ${d.quota}g quota.`, 640, 134, 13, '#ffffff', 'center');
    text('The valley goes hungry — but the wind remembers every lane you drew.', 640, 156, 12, '#d8e6f2', 'center');
    const stats = [
      ['SCORE', String(d.score)], ['HARVESTS', String(d.harvests)],
      ['BEST COMBO', `×${d.bestCombo}`], ['DIFFICULTY', d.difficulty],
    ];
    stats.forEach((s, i) => {
      const cx = 260 + i * 210;
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      rr(cx, 180, 190, 52, 8); ctx.fill();
      text(s[0], cx + 12, 196, 10, '#9fb8cc', 'left');
      text(s[1], cx + 12, 216, 15, '#ffffff', 'left');
    });
    text(`BEST SCORE ${best}  ·  Tip: steer rain early, save storm charge for blight, harvest the moment crops ripen.`, 640, 268, 12, '#ffd76a', 'center');
    text('Press SPACE or click to try again', 640, 308, 13, '#ffffff', 'center');
    text(`Feats this run: ${world.feats.count()}/10`, 640, 338, 12, '#9fb8cc', 'center');
  }

  function draw(world, run, screen, best, hall, selectedDiff, muted, dt) {
    fit();
    ctx.clearRect(0, 0, STAGE.width, STAGE.height);
    drawSky(world, run);
    drawWindLanes(world);
    for (const c of world.clouds.list()) drawCloud(c);
    drawField(world);
    drawBolts(world);
    drawParticles(dt || 0);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_DRAFT) {
      drawHud(world, run, best, muted);
      drawSidebar(world, run);
      drawFooter(world, run);
    }
    if (screen === SCREEN_TITLE) drawTitle(world, run, best, hall, selectedDiff);
    else if (screen === SCREEN_DRAFT) drawDraft(world, run);
    else if (screen === SCREEN_PAUSED) drawPaused(world, run);
    else if (screen === SCREEN_VICTORY) drawVictory(world, run, best);
    else if (screen === SCREEN_DEFEAT) drawDefeat(world, run, best);
  }
  return { draw, burst, fit };
}
