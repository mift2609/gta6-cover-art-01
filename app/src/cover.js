// Vice Cover Studio render engine: draws a multi-panel GTA-style cover onto a
// 2D canvas. Every effect is deterministic — fixed gradients, blend modes and a
// halftone dot pattern computed from grid positions, so the same state always
// paints the same cover. No network, no clock, no randomness here.

export const SAMPLE_NAMES = ['woman-sunset', 'man-neon', 'street-sunset', 'pier', 'boulevard'];

// Colour grades: [top, middle, bottom] tints in RGB, plus a soft wash colour.
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    top: [255, 46, 136],
    mid: [255, 122, 26],
    bottom: [0, 190, 200],
    wash: 'rgba(255, 90, 60, 0.16)',
    accent: '#ffd23e',
  },
  neon: {
    label: 'Neon Nights',
    top: [168, 46, 255],
    mid: [255, 46, 168],
    bottom: [0, 224, 255],
    wash: 'rgba(150, 60, 255, 0.18)',
    accent: '#37e6e0',
  },
  golden: {
    label: 'Golden Hour',
    top: [255, 176, 32],
    mid: [255, 122, 26],
    bottom: [140, 70, 10],
    wash: 'rgba(255, 176, 32, 0.20)',
    accent: '#ff8ac2',
  },
};

// Panel layouts. Each panel is a fraction of the cover; the title band is the
// strip at the bottom that every layout reserves for the lettering.
export const LAYOUTS = {
  trio: {
    label: 'Vice Trio',
    band: 0.24,
    panels: [
      { x: 0.0, y: 0.0, w: 0.30, h: 0.76 },
      { x: 0.30, y: 0.0, w: 0.40, h: 0.76 },
      { x: 0.70, y: 0.0, w: 0.30, h: 0.76 },
    ],
  },
  duo: {
    label: 'Duo',
    band: 0.24,
    panels: [
      { x: 0.0, y: 0.0, w: 0.50, h: 0.76 },
      { x: 0.50, y: 0.0, w: 0.50, h: 0.76 },
    ],
  },
  solo: {
    label: 'Solo',
    band: 0.24,
    panels: [
      { x: 0.0, y: 0.0, w: 1.0, h: 0.76 },
    ],
  },
};

export const TITLE_COLOURS = ['#ffffff', '#ffd23e', '#ff5ea8', '#37e6e0'];

function rgba(rgb, alpha) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/** Panel rectangles in pixels for a layout at cover size w x h. */
export function layoutPanels(layoutName, w, h) {
  const layout = LAYOUTS[layoutName] ?? LAYOUTS.trio;
  const bandH = h * layout.band;
  const panels = layout.panels.map((p) => ({
    x: p.x * w,
    y: p.y * h,
    w: p.w * w,
    h: p.h * h,
  }));
  return { panels, band: { x: 0, y: h - bandH, w, h: bandH } };
}

/** Keeps a pan offset inside the photo so the panel never shows empty space. */
export function clampPan(photo, rect, zoom, ox, oy) {
  if (!photo) return { ox: 0, oy: 0 };
  const base = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight);
  const shownW = photo.naturalWidth * base * zoom;
  const shownH = photo.naturalHeight * base * zoom;
  const maxX = Math.max(0, (shownW - rect.w) / 2 / rect.w);
  const maxY = Math.max(0, (shownH - rect.h) / 2 / rect.h);
  return {
    ox: Math.max(-maxX, Math.min(maxX, ox)),
    oy: Math.max(-maxY, Math.min(maxY, oy)),
  };
}

function drawPhotoInto(ctx, photo, rect, zoom, ox, oy) {
  if (!photo) {
    ctx.fillStyle = '#3a1c5e';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    return;
  }
  const base = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight);
  const scale = base * zoom;
  const drawW = photo.naturalWidth * scale;
  const drawH = photo.naturalHeight * scale;
  const centreX = rect.x + rect.w / 2 + ox * rect.w;
  const centreY = rect.y + rect.h / 2 + oy * rect.h;
  ctx.drawImage(photo, centreX - drawW / 2, centreY - drawH / 2, drawW, drawH);
}

/** Sunset / neon tint over one panel: a vertical gradient plus a soft wash. */
function gradePanel(ctx, rect, grade) {
  const wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  wash.addColorStop(0, rgba(grade.top, 0.20));
  wash.addColorStop(0.55, rgba(grade.mid, 0.08));
  wash.addColorStop(1, rgba(grade.bottom, 0.30));
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grade.wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'source-over';
  const shade = ctx.createLinearGradient(0, rect.y + rect.h * 0.55, 0, rect.y + rect.h);
  shade.addColorStop(0, 'rgba(10, 4, 20, 0)');
  shade.addColorStop(1, 'rgba(10, 4, 20, 0.38)');
  ctx.fillStyle = shade;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/**
 * Fixed halftone dot field. Dot size comes from the grid position alone
 * (a sine blend), so the pattern is identical on every render.
 */
export function halftone(ctx, x, y, w, h, colour, maxAlpha) {
  const step = Math.max(9, Math.round(w / 46));
  ctx.fillStyle = colour;
  for (let row = 0; row * step < h; row += 1) {
    const fade = 1 - row * step / h;
    for (let col = 0; col * step < w; col += 1) {
      const swell = 0.5 + 0.5 * Math.sin(col * 1.7 + row * 2.3);
      const radius = 0.6 + 2.4 * swell * fade;
      if (radius < 0.7) continue;
      ctx.globalAlpha = maxAlpha * fade;
      ctx.beginPath();
      ctx.arc(x + col * step + step / 2, y + row * step + step / 2, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function fitFont(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

function drawTitleBand(ctx, band, state, grade) {
  const { w, h } = { w: band.w, h: band.h };
  const bg = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
  bg.addColorStop(0, '#2a0a3d');
  bg.addColorStop(1, '#0d0518');
  ctx.fillStyle = bg;
  ctx.fillRect(band.x, band.y, w, h);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(band.x, band.y, w, Math.max(3, h * 0.03));
  halftone(ctx, band.x + w * 0.02, band.y + h * 0.12, w * 0.16, h * 0.76, grade.accent, 0.5);
  halftone(ctx, band.x + w * 0.82, band.y + h * 0.12, w * 0.16, h * 0.76, grade.accent, 0.5);

  const title = (state.title || 'VICE CITY').trim().toUpperCase();
  const sub = (state.subtitle || '').trim().toUpperCase();
  const centreX = band.x + w / 2;
  const titleSize = fitFont(ctx, title, w * 0.86, h * 0.52, 'Anton, sans-serif');
  const titleY = band.y + h * 0.58;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160818';
  ctx.lineWidth = Math.max(3, titleSize * 0.13);
  ctx.strokeText(title, centreX, titleY);
  ctx.fillStyle = state.titleColour || '#ffffff';
  ctx.fillText(title, centreX, titleY);
  if (sub) {
    const subSize = fitFont(ctx, sub, w * 0.7, h * 0.17, 'bold sans-serif');
    ctx.font = `bold ${subSize}px sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, subSize * 0.22)}px`; } catch (err) { /* older canvas: no tracking */ }
    ctx.fillStyle = grade.accent;
    ctx.fillText(sub, centreX, band.y + h * 0.86);
    try { ctx.letterSpacing = '0px'; } catch (err) { /* older canvas: no tracking */ }
  }
}

/**
 * Draws the whole cover. `state` holds layout, grade, title, subtitle,
 * titleColour and slots: [{ photo, zoom, ox, oy }] — one slot per panel.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  ctx.fillStyle = '#14091f';
  ctx.fillRect(0, 0, w, h);
  const { panels, band } = layoutPanels(state.layout, w, h);
  const gutter = Math.max(3, Math.round(w * 0.004));
  ctx.fillStyle = '#f4ecff';
  ctx.fillRect(0, 0, w, band.y + band.h);
  panels.forEach((rect, i) => {
    const slot = (state.slots && state.slots[i]) || { photo: null, zoom: 1, ox: 0, oy: 0 };
    const inner = {
      x: rect.x + gutter,
      y: rect.y + gutter,
      w: rect.w - gutter * 2,
      h: rect.h - gutter * 2,
    };
    ctx.save();
    ctx.beginPath();
    ctx.rect(inner.x, inner.y, inner.w, inner.h);
    ctx.clip();
    const pan = clampPan(slot.photo, inner, slot.zoom || 1, slot.ox || 0, slot.oy || 0);
    drawPhotoInto(ctx, slot.photo, inner, slot.zoom || 1, pan.ox, pan.oy);
    gradePanel(ctx, inner, grade);
    halftone(ctx, inner.x + inner.w * 0.68, inner.y + inner.h * 0.06, inner.w * 0.30, inner.h * 0.22, '#ffffff', 0.28);
    ctx.restore();
  });
  drawTitleBand(ctx, band, state, grade);
}
