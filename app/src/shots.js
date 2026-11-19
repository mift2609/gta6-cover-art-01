// Fixed scenes for screenshots: ?shot=editor shows the editor with sample
// photos loaded; ?shot=cover shows the finished cover alone, at the export
// size the `size` query gives. `photos` names comma-separated samples,
// `caption` the title, `subtitle` the tagline, `layout` and `grade` the look.
// window.__shotReady is set once the scene has painted, so a screenshot
// driver knows the cover is ready to capture.
export async function runShot(shot, query, apply) {
  const config = {
    photo: query.get('photo') || 'woman-sunset',
    photos: (query.get('photos') || '').split(',').map((s) => s.trim()).filter(Boolean),
    caption: query.get('caption') || 'VICE CITY',
    subtitle: query.get('subtitle') || 'SUNSET HEIST',
    layout: query.get('layout') || 'trio',
    grade: query.get('grade') || 'sunset',
    size: query.get('size') || '1920x1080',
  };
  if (shot === 'cover') document.body.classList.add('shot-cover');
  // Make sure the display font is really in before the first paint, so the
  // title is drawn in Anton on the very first frame, not a fallback.
  if (document.fonts && document.fonts.load) {
    await document.fonts.load('100px Anton').catch(() => {});
  }
  await apply(config);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
