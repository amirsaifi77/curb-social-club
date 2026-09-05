// 06 — Screens page, "iOS Screens" section: Feed and List (iPhone 16 Pro, 402 x 874). Load figma-generate-design before running 06/07/08.
const page = PAGE('Screens'); await figma.setCurrentPageAsync(page);
const COMPS = PAGE('Components');
const CS = (n) => COMPS.findOne(x => (x.type === 'COMPONENT_SET' || x.type === 'COMPONENT') && x.name === n);
const variant = (setName, props) => { const s = CS(setName); return s.type === 'COMPONENT' ? s : s.children.find(c => Object.entries(props).every(([k, v]) => c.name.includes(`${k}=${v}`))); };
const setProps = (inst, props) => { const map = {}; for (const [k, v] of Object.entries(props)) { const key = Object.keys(inst.componentProperties).find(p => p.split('#')[0] === k); if (key) map[key] = v; } inst.setProperties(map); return inst; };
let section = page.findOne(n => n.type === 'SECTION' && n.name === 'iOS Screens');
if (!section) { section = figma.createSection(); section.name = 'iOS Screens'; section.x = 0; section.y = 0; section.resizeWithoutConstraints(5 * 470 + 60, 1000); }
async function statusBar(parent, dark = false) {
  try { const sb = await figma.importComponentByKeyAsync('51ddb19de206b67eae2d554b1d20c018feb754f4'); const i = sb.createInstance(); parent.appendChild(i); i.x = 0; i.y = 0; i.resize(402, i.height); return i; }
  catch (e) { const t = await text('9:41', 'Web/Headline', dark ? 'text/onPhoto' : 'text/primary', { weight: 'Semi Bold', name: 'Status bar' }); parent.appendChild(t); t.x = 32; t.y = 18; return t; }
}
function screen(name, bg = 'bg/canvas') {
  const f = figma.createFrame(); f.name = name; f.resize(402, 874); f.clipsContent = true; fill(f, bg); f.cornerRadius = 0; section.appendChild(f); return f;
}
function tabBar(parent, active) { const i = variant('Glass Tab Bar', { Active: active }).createInstance(); parent.appendChild(i); i.x = 16; i.y = 874 - 16 - 64; i.constraints = { horizontal: 'STRETCH', vertical: 'MAX' }; return i; }
const homeIndicator = (parent, onDark = false) => { const r = figma.createRectangle(); r.name = 'Home indicator'; r.resize(139, 5); r.cornerRadius = 3; fill(r, onDark ? 'text/onPhoto' : 'text/primary'); parent.appendChild(r); r.x = (402 - 139) / 2; r.y = 874 - 8 - 5; };
const out = {};

// ---------- FEED ----------
{
  const f = screen('Feed'); f.x = 20; f.y = 60;
  const scroll = figma.createAutoLayout('VERTICAL', { name: 'Content', itemSpacing: 14 }); pad(scroll, 140, 16, 120, 16); f.appendChild(scroll); scroll.x = 0; scroll.y = 0; scroll.layoutSizingHorizontal = 'FIXED'; scroll.resize(402, 900);
  const chips = figma.createAutoLayout('HORIZONTAL', { name: 'Filters', itemSpacing: 8 }); scroll.appendChild(chips);
  for (const [label, sel, ic] of [['Near me', true], ['Following', false], ['Photos', false], ['Recurring', false, 'repeat']]) {
    const i = variant('Filter Chip', { Selected: sel ? 'True' : 'False' }).createInstance(); chips.appendChild(i); setProps(i, { Label: label, 'Show Icon': !!ic }); if (ic) setProps(i, { Icon: ICON(ic).id });
  }
  const cards = [
    ['Sunrise Coffee & Cars', 'Sat 7:00 to 10:00am', 'Victoria Gardens, Rancho Cucamonga', '4.2 mi', '42 going', 'Today', 'Dawn'],
    ['Inland Empire Euro Meet', 'Sun 8:00am', 'Ontario Mills west lot', '6.8 mi', '118 going', 'Recurring', 'Sky'],
    ['Riverside Sunday Roll-In', 'Sun 8:30am', 'Canyon Crest Towne Centre', '18 mi', '31 going', null, 'Dusk'],
  ];
  for (const [t, time, place, dist, going, badge, tone] of cards) {
    const i = variant('Event Card', { Layout: 'Feed' }).createInstance(); scroll.appendChild(i); i.layoutSizingHorizontal = 'FILL';
    setProps(i, { Title: t, Time: time, Place: place, Distance: dist, Going: going, 'Show Badge': !!badge, Photo: variant('Photo Placeholder', { Tone: tone }).id });
    if (badge) setProps(i, { Badge: variant('Status Badge', { Kind: badge }).id });
  }
  // top fade + toolbar
  const fade = figma.createRectangle(); fade.name = 'Top fade'; fade.resize(402, 110); f.appendChild(fade);
  fade.fills = [{ type: 'GRADIENT_LINEAR', gradientTransform: [[0,1,0],[-1,0,1]], gradientStops: [{ position: 0.6, color: { ...hx('#FBF7F1'), a: 1 } }, { position: 1, color: { ...hx('#FBF7F1'), a: 0 } }] }];
  const tb = variant('Glass Toolbar', { Type: 'Feed' }).createInstance(); f.appendChild(tb); tb.x = 16; tb.y = 62; tb.resize(370, tb.height);
  await statusBar(f); tabBar(f, 'Feed'); homeIndicator(f);
  out.feed = f.id;
}

// ---------- LIST ----------
{
  const f = screen('List'); f.x = 20 + 470; f.y = 60;
  const scroll = figma.createAutoLayout('VERTICAL', { name: 'Content', itemSpacing: 10 }); pad(scroll, 142, 16, 120, 16); f.appendChild(scroll); scroll.x = 0; scroll.y = 0; scroll.layoutSizingHorizontal = 'FIXED'; scroll.resize(402, 900);
  const dayHeader = async (label) => { const t = await text(label.toUpperCase(), 'Web/Footnote', 'text/tertiary', { weight: 'Semi Bold' }); t.letterSpacing = { unit: 'PIXELS', value: 0.4 }; scroll.appendChild(t); };
  await dayHeader('Saturday');
  const rows = [
    ['Sunrise Coffee & Cars', '7:00 to 10:00am', 'Victoria Gardens · 4.2 mi', '42 going', 'Today', 'Dawn'],
    ['Fontana Foothill Meet', '8:00am', 'Sierra Ave & Foothill · 2.1 mi', '19 going', null, 'Mist'],
    'Sunday',
    ['Inland Empire Euro Meet', '8:00am', 'Ontario Mills west lot · 6.8 mi', '118 going', 'Weekly', 'Sky'],
    ['Riverside Sunday Roll-In', '8:30am', 'Canyon Crest Towne Centre · 18 mi', '31 going', null, 'Dusk'],
    ['Chino Hills Cars & Cortados', '9:00am', 'The Shoppes at Chino Hills · 14 mi', '56 going', null, 'Mist'],
  ];
  for (const r of rows) {
    if (typeof r === 'string') { await dayHeader(r); continue; }
    const [t, time, place, going, badge, tone] = r;
    const i = variant('Event Card', { Layout: 'List' }).createInstance(); scroll.appendChild(i); i.layoutSizingHorizontal = 'FILL';
    setProps(i, { Title: t, Time: time, Place: place, Going: going, 'Show Badge': !!badge, Photo: variant('Photo Placeholder', { Tone: tone }).id });
    if (badge) setProps(i, { Badge: variant('Status Badge', { Kind: badge }).id });
  }
  const fade = figma.createRectangle(); fade.name = 'Top fade'; fade.resize(402, 130); f.appendChild(fade);
  fade.fills = [{ type: 'GRADIENT_LINEAR', gradientTransform: [[0,1,0],[-1,0,1]], gradientStops: [{ position: 0.7, color: { ...hx('#FBF7F1'), a: 1 } }, { position: 1, color: { ...hx('#FBF7F1'), a: 0 } }] }];
  // header: count + segmented sort
  const head = figma.createAutoLayout('HORIZONTAL', { name: 'Header', primaryAxisAlignItems: 'SPACE_BETWEEN', counterAxisAlignItems: 'CENTER' }); f.appendChild(head); head.x = 16; head.y = 62; head.resize(370, 60); head.primaryAxisSizingMode = 'FIXED';
  const tc = figma.createAutoLayout('VERTICAL', { name: 'Title', itemSpacing: 2 }); tc.appendChild(await text('Within 25 mi · this weekend', 'Web/Footnote', 'text/tertiary', { weight: 'Medium' })); tc.appendChild(await text('14 meets', 'Web/Title 1', 'text/primary')); head.appendChild(tc);
  const seg = figma.createAutoLayout('HORIZONTAL', { name: 'Sort', counterAxisAlignItems: 'CENTER' }); pad(seg, 0, 6, 0, 6); seg.resize(100, 44); seg.counterAxisSizingMode = 'FIXED'; radius(seg, 'radius/pill'); glass(seg, 'regular'); head.appendChild(seg);
  for (const [label, on] of [['Date', true], ['Distance', false]]) { const s = figma.createAutoLayout('HORIZONTAL', { counterAxisAlignItems: 'CENTER', name: label }); pad(s, 0, 12, 0, 12); s.resize(50, 34); s.counterAxisSizingMode = 'FIXED'; radius(s, 'radius/pill'); if (on) fill(s, 'bg/inverse'); s.appendChild(await text(label, 'Web/Footnote', on ? 'text/inverse' : 'text/secondary', { weight: on ? 'Semi Bold' : 'Medium' })); seg.appendChild(s); }
  // floating Map toggle
  const mapBtn = figma.createAutoLayout('HORIZONTAL', { name: 'Map toggle', itemSpacing: 6, counterAxisAlignItems: 'CENTER' }); pad(mapBtn, 0, 16, 0, 16); mapBtn.resize(80, 40); mapBtn.counterAxisSizingMode = 'FIXED'; radius(mapBtn, 'radius/pill'); glass(mapBtn, 'regular');
  mapBtn.appendChild(icon('map', 'icon/default', 18)); mapBtn.appendChild(await text('Map', 'Web/Subheadline', 'text/primary', { weight: 'Semi Bold', size: 14 })); f.appendChild(mapBtn); mapBtn.x = (402 - mapBtn.width) / 2; mapBtn.y = 874 - 98 - 40;
  await statusBar(f); tabBar(f, 'Feed'); homeIndicator(f);
  out.list = f.id;
}
return out;
