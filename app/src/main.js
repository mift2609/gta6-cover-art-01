// Vice Cover Studio editor: wires the controls to the cover engine, loads
// photos from the user's machine (FileReader / object URLs, never uploaded),
// lets each panel be dragged and zoomed, and exports PNGs in post sizes.

import { drawCover, layoutPanels, clampPan, SAMPLE_NAMES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const statusLine = document.getElementById('status');
const slotsBox = document.getElementById('panelSlots');

const SIZES = ['1920x1080', '1080x1350', '1080x1080'];
const SLOT_LABELS = ['Panel A · left', 'Panel B · hero', 'Panel C · right'];

// One slot per panel; the hero photo is slot 1 in the trio layout.
const state = {
  layout: 'trio',
  grade: 'sunset',
  title: 'VICE CITY',
  subtitle: 'SUNSET HEIST',
  titleColour: '#ffffff',
  size: '1920x1080',
  slots: [
    { photo: null, zoom: 1.15, ox: 0, oy: 0 },
    { photo: null, zoom: 1.15, ox: 0, oy: 0 },
    { photo: null, zoom: 1.15, ox: 0, oy: 0 },
  ],
};
let activeSlot = 1;

function slotCount() {
  return state.layout === 'trio' ? 3 : state.layout === 'duo' ? 2 : 1;
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load image'));
    img.src = url;
  });
}

async function loadSample(name) {
  return loadImage(`samples/${name}.jpg`);
}

function redraw() {
  const [w, h] = state.size.split('x').map(Number);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(canvas, state);
  document.querySelectorAll('.panel-slot').forEach((el, i) => {
    el.classList.toggle('active', i === activeSlot);
  });
}

function setStatus(text) {
  statusLine.textContent = text;
}

/** Builds the per-panel photo controls: sample buttons, upload, zoom slider. */
function buildSlotControls() {
  slotsBox.innerHTML = '';
  state.slots.forEach((slot, i) => {
    const box = document.createElement('div');
    box.className = 'panel-slot';
    box.dataset.slot = String(i);
    const heading = document.createElement('h3');
    heading.textContent = SLOT_LABELS[i];
    box.appendChild(heading);

    const row = document.createElement('div');
    row.className = 'row';
    SAMPLE_NAMES.forEach((name) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sample-btn';
      btn.textContent = name;
      btn.addEventListener('click', async () => {
        slot.photo = await loadSample(name);
        slot.ox = 0;
        slot.oy = 0;
        activeSlot = i;
        redraw();
      });
      row.appendChild(btn);
    });
    const upload = document.createElement('input');
    upload.type = 'file';
    upload.accept = 'image/*';
    upload.setAttribute('aria-label', `Upload a photo for ${SLOT_LABELS[i]}`);
    upload.addEventListener('change', async () => {
      const file = upload.files && upload.files[0];
      if (!file) return;
      slot.photo = await loadImage(URL.createObjectURL(file));
      slot.ox = 0;
      slot.oy = 0;
      activeSlot = i;
      redraw();
      setStatus(`Loaded ${file.name} into ${SLOT_LABELS[i]}.`);
    });
    row.appendChild(upload);
    box.appendChild(row);

    const zoomLabel = document.createElement('label');
    zoomLabel.className = 'zoom';
    zoomLabel.textContent = 'Zoom';
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '100';
    zoom.max = '300';
    zoom.value = String(Math.round(slot.zoom * 100));
    zoom.setAttribute('aria-label', `Zoom for ${SLOT_LABELS[i]}`);
    zoom.addEventListener('input', () => {
      slot.zoom = Number(zoom.value) / 100;
      activeSlot = i;
      redraw();
    });
    zoomLabel.appendChild(zoom);
    box.appendChild(zoomLabel);
    box.addEventListener('click', () => { activeSlot = i; redraw(); });
    slotsBox.appendChild(box);
  });
}

function bindChoices(name, apply) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked) { apply(input.value); redraw(); }
    });
  });
}

bindChoices('layout', (value) => {
  state.layout = value;
  activeSlot = state.layout === 'trio' ? 1 : 0;
});
bindChoices('grade', (value) => { state.grade = value; });
bindChoices('titleColour', (value) => { state.titleColour = value; });

titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });

document.getElementById('fillAll').addEventListener('click', () => {
  const hero = state.layout === 'trio' ? 1 : 0;
  const source = state.slots[hero];
  state.slots.forEach((slot) => {
    slot.photo = source.photo;
    slot.zoom = source.zoom;
    slot.ox = source.ox;
    slot.oy = source.oy;
  });
  redraw();
  setStatus('Hero photo now fills every panel.');
});

// Drag to pan the panel under the pointer; scroll to zoom it.
function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  const { panels } = layoutPanels(state.layout, canvas.width, canvas.height);
  const hit = panels.findIndex((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h);
  return hit === -1 ? null : { index: hit, x, y, panel: panels[hit] };
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (!hit) return;
  activeSlot = hit.index;
  drag = { x: hit.x, y: hit.y, panel: hit.panel };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const hit = panelAt(e.clientX, e.clientY);
  if (!hit) return;
  const slot = state.slots[activeSlot];
  slot.ox += (hit.x - drag.x) / drag.panel.w;
  slot.oy += (hit.y - drag.y) / drag.panel.h;
  const pan = clampPan(slot.photo, drag.panel, slot.zoom, slot.ox, slot.oy);
  slot.ox = pan.ox;
  slot.oy = pan.oy;
  drag = { x: hit.x, y: hit.y, panel: drag.panel };
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const slot = state.slots[activeSlot];
  slot.zoom = Math.max(1, Math.min(3, slot.zoom * (1 - e.deltaY * 0.001)));
  const zoomInput = slotsBox.querySelectorAll('input[type="range"]')[activeSlot];
  if (zoomInput) zoomInput.value = String(Math.round(slot.zoom * 100));
  redraw();
}, { passive: false });

/** Renders the cover at a post size and returns the PNG as a data URL. */
export function exportDataURL(sizeText) {
  const [w, h] = sizeText.split('x').map(Number);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state);
  return off.toDataURL('image/png');
}
window.__exportDataURL = exportDataURL;

function exportCover(sizeText) {
  const [w, h] = sizeText.split('x').map(Number);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state);
  off.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — try again.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${w}x${h}.png`;
    a.click();
    setStatus(`Saved vice-cover-${w}x${h}.png`);
  }, 'image/png');
}

SIZES.forEach((sizeText) => {
  document.getElementById(`export-${sizeText}`).addEventListener('click', () => {
    state.size = sizeText;
    redraw();
    exportCover(sizeText);
  });
});

/** Applies a fixed scene (from ?shot=) and paints it once photos are in. */
export async function applyShot(config) {
  state.layout = config.layout || state.layout;
  state.grade = config.grade || state.grade;
  state.title = config.caption || state.title;
  state.subtitle = config.subtitle || state.subtitle;
  state.size = config.size || state.size;
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  document.querySelectorAll('input[name="layout"]').forEach((el) => { el.checked = el.value === state.layout; });
  document.querySelectorAll('input[name="grade"]').forEach((el) => { el.checked = el.value === state.grade; });
  const names = config.photos && config.photos.length ? config.photos : [config.photo || 'woman-sunset'];
  const loaded = await Promise.all(names.map((name) => loadSample(name).catch(() => null)));
  loaded.forEach((img, i) => {
    if (img) {
      state.slots[i].photo = img;
      state.slots[i].ox = 0;
      state.slots[i].oy = 0;
    }
  });
  activeSlot = state.layout === 'trio' ? 1 : 0;
  redraw();
}

buildSlotControls();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, applyShot);
} else {
  // Auto-load sample portraits so the cover is alive on first open.
  Promise.all([
    loadSample('man-neon'),
    loadSample('woman-sunset'),
    loadSample('street-sunset'),
  ]).then(([left, hero, right]) => {
    state.slots[0].photo = left;
    state.slots[1].photo = hero;
    state.slots[2].photo = right;
    redraw();
  }).catch(() => redraw());
  redraw();
}

// Re-paint once the display font arrives, so lettering uses Anton, not a fallback.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => redraw());
}
