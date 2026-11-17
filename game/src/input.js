// Input for Stormwright: mouse drags draw wind lanes, clicks harvest ripe
// crops and strike storm clouds, keys do the same for keyboard players.
// The game converts screen pixels to virtual stage coordinates so the same
// gestures work at any window size.
import { STAGE } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_STRIKE = 8;

export function createInput(canvas) {
  let actions = 0;
  let drawing = false;
  let points = [];
  let mouse = { x: 0, y: 0, down: false };
  let clicked = null;
  let keys = new Set();

  function toStage(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / STAGE.width, rect.height / STAGE.height);
    const ox = (rect.width - STAGE.width * scale) / 2;
    const oy = (rect.height - STAGE.height * scale) / 2;
    return {
      x: (event.clientX - rect.left - ox) / scale,
      y: (event.clientY - rect.top - oy) / scale,
    };
  }
  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const p = toStage(event);
    mouse = { x: p.x, y: p.y, down: true };
    drawing = true;
    points = [p];
    clicked = p;
  });
  canvas.addEventListener('pointermove', (event) => {
    const p = toStage(event);
    mouse = { x: p.x, y: p.y, down: mouse.down };
    if (drawing) {
      const last = points[points.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) > 6) points.push(p);
    }
  });
  function endPointer(event) {
    if (!drawing) return;
    drawing = false;
    if (points.length < 2) points = [points[0], { x: points[0].x + 1, y: points[0].y }];
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
    if (event.code === 'KeyL') actions |= ACTION_STRIKE;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));

  return {
    takeActions() { const a = actions; actions = 0; return a; },
    takeStroke() {
      if (drawing || points.length < 2) return null;
      const s = points; points = [];
      return s;
    },
    takeClick() { const c = clicked; clicked = null; return c; },
    isDrawing() { return drawing; },
    livePoints() { return points; },
    mouse() { return mouse; },
    hasKey(code) { return keys.has(code); },
  };
}
