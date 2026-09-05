// Cars and Coffee — Figma build scripts
// File: https://www.figma.com/design/68kmmZuZQ2jrAWYu7vtVIe  (fileKey 68kmmZuZQ2jrAWYu7vtVIe)
//
// STATUS 2026-09-05: Foundations page and the Icon set on Components are built.
// The Figma Starter plan allows 20 MCP tool calls per month; the quota ran out after the icons.
// Each numbered script below is one use_figma call. Prepend this prelude to every script
// (cat 00-prelude.js 0N-*.js) and run them in order with skillNames "figma-use,figma-generate-library"
// (01-06) or "figma-use,figma-generate-design" (07-08).
//
// Known plan constraints already handled:
//   - 1 variable mode per collection  -> Dark theme lives in the parallel collection "Colors (Dark)".
//   - 3 pages max                     -> pages are Foundations, Components, Screens (iOS + Web sections).
//   - SF Pro is installed locally but does not lay out in the MCP renderer -> screens use Inter and the Web/* text styles.

const PAGE = (name) => figma.root.children.find(p => p.name === name);
const hx = (h) => { const c = h.replace('#',''); return { r: parseInt(c.slice(0,2),16)/255, g: parseInt(c.slice(2,4),16)/255, b: parseInt(c.slice(4,6),16)/255 }; };
const hxa = (h) => ({ ...hx(h), a: h.length === 9 ? parseInt(h.slice(7,9),16)/255 : 1 });
const ALLV = await figma.variables.getLocalVariablesAsync();
const COLLS = await figma.variables.getLocalVariableCollectionsAsync();
const CID = (n) => COLLS.find(c => c.name === n).id;
const V = (coll, name) => { const v = ALLV.find(x => x.name === name && x.variableCollectionId === CID(coll)); if (!v) throw new Error('missing var ' + coll + '/' + name); return v; };
const C = (name) => V('Colors', name);
const paint = (v) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v);
const fill = (node, name) => { node.fills = [paint(C(name))]; };
const stroke = (node, name, w = 1) => { node.strokes = [paint(C(name))]; node.strokeWeight = w; node.strokeAlign = 'INSIDE'; };
const radius = (node, name) => { for (const k of ['topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius']) node.setBoundVariable(k, V('Radius', name)); };
const pad = (node, t, r, b, l) => { node.paddingTop = t; node.paddingRight = r; node.paddingBottom = b; node.paddingLeft = l; };
const TEXT_STYLES = await figma.getLocalTextStylesAsync();
const EFFECT_STYLES = await figma.getLocalEffectStylesAsync();
const TS = (n) => TEXT_STYLES.find(s => s.name === n);
const ES = (n) => EFFECT_STYLES.find(s => s.name === n);
for (const s of ['Regular','Medium','Semi Bold','Bold']) await figma.loadFontAsync({ family: 'Inter', style: s });
// text(chars, styleName like 'Web/Headline', colorVarName)
async function text(chars, styleName, colorName = 'text/primary', opts = {}) {
  const t = figma.createText(); t.characters = chars;
  await t.setTextStyleIdAsync(TS(styleName).id);
  t.fills = [paint(C(colorName))];
  if (opts.weight) t.fontName = { family: 'Inter', style: opts.weight };
  if (opts.size) t.fontSize = opts.size;
  if (opts.width) { t.textAutoResize = 'HEIGHT'; t.resize(opts.width, t.height); }
  if (opts.name) t.name = opts.name;
  return t;
}
const ICON = (name) => PAGE('Components').findOne(n => n.type === 'COMPONENT' && n.name === 'Icon/' + name);
// icon instance recolored to a semantic color var
function icon(name, colorName = 'icon/default', size = 24) {
  const inst = ICON(name).createInstance(); inst.resize(size, size);
  for (const v of inst.findAll(n => n.type === 'VECTOR' || n.type === 'ELLIPSE' || n.type === 'RECTANGLE')) {
    if (v.strokes.length) v.strokes = [paint(C(colorName))];
    if (v.fills.length) v.fills = [paint(C(colorName))];
  }
  return inst;
}
// Liquid Glass recipe: translucent fill + 1px border + effect style (blur, 1px inner highlight, shadow)
function glass(node, kind = 'regular') {
  if (kind === 'tinted') { fill(node, 'glass/tinted/bg'); stroke(node, 'glass/tinted/border'); node.effectStyleId = ES('Glass/Tinted').id; }
  else if (kind === 'dark') { fill(node, 'glass/regular/bg'); stroke(node, 'glass/regular/border'); node.effectStyleId = ES('Glass/Dark').id; }
  else { fill(node, 'glass/regular/bg'); stroke(node, 'glass/regular/border'); node.effectStyleId = ES('Glass/Regular').id; }
}
function layoutSet(set, cols, gapX = 24, gapY = 24, padding = 24) {
  let x = padding, y = padding, rowH = 0, maxW = 0;
  set.children.forEach((ch, i) => {
    if (i && i % cols === 0) { y += rowH + gapY; x = padding; rowH = 0; }
    ch.x = x; ch.y = y; x += ch.width + gapX; rowH = Math.max(rowH, ch.height); maxW = Math.max(maxW, x);
  });
  set.resizeWithoutConstraints(maxW - gapX + padding, y + rowH + padding);
}
function nextY(page, gap = 80) { let y = 0; for (const n of page.children) y = Math.max(y, n.y + n.height); return y + gap; }
const COMP = (name) => PAGE('Components').findOne(n => (n.type === 'COMPONENT_SET' || n.type === 'COMPONENT') && n.name === name);
const AVATAR_COLORS = ['pin/today', 'pin/upcoming', 'pin/recurring', 'pin/now', 'pin/past', 'status/error/text'];
function avatarStack(n = 3, size = 26) {
  const row = figma.createAutoLayout('HORIZONTAL', { name: 'Avatars', itemSpacing: -8 });
  for (let i = 0; i < n; i++) { const a = figma.createEllipse(); a.resize(size, size); fill(a, AVATAR_COLORS[i % AVATAR_COLORS.length]); stroke(a, 'bg/surface', 2); a.strokeAlign = 'OUTSIDE'; row.appendChild(a); }
  return row;
}
