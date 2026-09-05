// 03 — Confidence Chip (Level=Sure|Check|Guess), Filter Chip (Selected=True|False), Status Badge (Kind=Today|Recurring), Map Pin (State=now|today|upcoming|recurring|past|cluster)
const page = PAGE('Components'); await figma.setCurrentPageAsync(page);
const out = {};

// Confidence Chip — import preview: high = success, medium = warning, low = error
if (!COMP('Confidence Chip')) {
  const spec = { Sure: ['status/success/tint', 'status/success/text', 'seal-check'], Check: ['status/warning/tint', 'status/warning/text', 'question-circle'], Guess: ['status/error/tint', 'status/error/text', 'warning-triangle'] };
  const comps = [];
  for (const [level, [bg, fg, ic]] of Object.entries(spec)) {
    const c = figma.createComponent(); c.name = `Level=${level}`;
    c.layoutMode = 'HORIZONTAL'; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; c.resize(60, 24);
    c.counterAxisAlignItems = 'CENTER'; c.itemSpacing = 4; pad(c, 0, 8, 0, 8); radius(c, 'radius/chip'); fill(c, bg);
    c.appendChild(icon(ic, fg, 14));
    c.appendChild(await text(level, 'Web/Caption 1', fg, { weight: 'Semi Bold', name: 'Label' }));
    comps.push(c);
  }
  const set = figma.combineAsVariants(comps, page); set.name = 'Confidence Chip';
  set.description = 'Import preview confidence. Sure = parsed from a structured field. Check = matched with a guess (tap to adjust). Guess = inferred from free text.';
  layoutSet(set, 3); set.x = 0; set.y = nextY(page); out.confidenceChip = set.id;
}

// Filter Chip — Feed filter row and import "Works with" chips
if (!COMP('Filter Chip')) {
  const comps = [];
  for (const sel of [true, false]) {
    const c = figma.createComponent(); c.name = `Selected=${sel ? 'True' : 'False'}`;
    c.layoutMode = 'HORIZONTAL'; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; c.resize(60, 28);
    c.counterAxisAlignItems = 'CENTER'; c.itemSpacing = 6; pad(c, 0, 10, 0, 10); radius(c, 'radius/chip');
    if (sel) { fill(c, 'bg/inverse'); } else { fill(c, 'bg/surface'); stroke(c, 'border/default'); }
    const ic = icon('repeat', sel ? 'text/inverse' : 'icon/default', 18); ic.name = 'Icon'; ic.visible = false; c.appendChild(ic);
    const t = await text('Near me', 'Web/Caption 1', sel ? 'text/inverse' : 'text/primary', { name: 'Label' }); c.appendChild(t);
    const lk = c.addComponentProperty('Label', 'TEXT', 'Near me'); const sk = c.addComponentProperty('Show Icon', 'BOOLEAN', false); const ik = c.addComponentProperty('Icon', 'INSTANCE_SWAP', ICON('repeat').id);
    t.componentPropertyReferences = { characters: lk }; ic.componentPropertyReferences = { visible: sk, mainComponent: ik };
    comps.push(c);
  }
  const set = figma.combineAsVariants(comps, page); set.name = 'Filter Chip'; set.description = 'Feed filter row. Selected chip is espresso with white text.';
  layoutSet(set, 2); set.x = 0; set.y = nextY(page); out.filterChip = set.id;
}

// Status Badge — the small chip on photos: Today (amber, espresso text) and Recurring (purple, white)
if (!COMP('Status Badge')) {
  const comps = [];
  for (const [kind, bg, fg, label] of [['Today', 'pin/today', 'pin/todayLabel', 'Today'], ['Recurring', 'pin/recurring', 'pin/label', 'Recurring'], ['Now', 'pin/now', 'pin/label', 'Happening now'], ['Weekly', 'pin/recurring', 'pin/label', 'Weekly']]) {
    const c = figma.createComponent(); c.name = `Kind=${kind}`;
    c.layoutMode = 'HORIZONTAL'; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; c.resize(60, 26);
    c.counterAxisAlignItems = 'CENTER'; pad(c, 0, 10, 0, 10); radius(c, 'radius/chip'); fill(c, bg);
    const t = await text(label, 'Web/Caption 1', fg, { name: 'Label' }); c.appendChild(t);
    const lk = c.addComponentProperty('Label', 'TEXT', label); t.componentPropertyReferences = { characters: lk };
    comps.push(c);
  }
  const set = figma.combineAsVariants(comps, page); set.name = 'Status Badge'; layoutSet(set, 4); set.x = 0; set.y = nextY(page); out.statusBadge = set.id;
}

// Map Pin — filled circle, 2px white ring, SF-Symbol-like glyph. Cluster shows a count.
if (!COMP('Map Pin')) {
  const spec = { now: ['pin/now', 'pin/label', 'car', 34], today: ['pin/today', 'pin/todayLabel', 'car', 38], upcoming: ['pin/upcoming', 'pin/label', 'car', 34], recurring: ['pin/recurring', 'pin/label', 'repeat', 34], past: ['pin/past', 'pin/label', 'car', 34], cluster: ['pin/cluster', 'pin/label', null, 40] };
  const comps = [];
  for (const [state, [bg, fg, ic, size]] of Object.entries(spec)) {
    const c = figma.createComponent(); c.name = `State=${state}`;
    c.layoutMode = 'HORIZONTAL'; c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'; c.resize(size, size);
    c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'; radius(c, 'radius/pill');
    fill(c, bg); stroke(c, 'pin/ring', state === 'today' ? 3 : 2); c.strokeAlign = 'OUTSIDE'; c.effectStyleId = ES('Shadow/Pin').id;
    if (ic) c.appendChild(icon(ic, fg, 18));
    else { const t = await text('3', 'Web/Subheadline', fg, { weight: 'Bold', name: 'Count' }); c.appendChild(t); const k = c.addComponentProperty('Count', 'TEXT', '3'); t.componentPropertyReferences = { characters: k }; }
    comps.push(c);
  }
  const set = figma.combineAsVariants(comps, page); set.name = 'Map Pin';
  set.description = 'Teardrop-free pins: filled circle, white ring, glyph. now = green, today = amber (espresso glyph), upcoming = sky, recurring = purple with repeat glyph, past = stone, cluster = espresso with count. Selected state: 2px ring, 1.2x scale.';
  layoutSet(set, 6, 32, 32, 32); set.x = 0; set.y = nextY(page); out.mapPin = set.id;
}
return out;
