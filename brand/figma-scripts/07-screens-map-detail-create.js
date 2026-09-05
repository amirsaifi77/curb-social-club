// 07 — Screens page, "iOS Screens" section: Map, Event Detail, Create from link (402 x 874). Run after 06.
const page = PAGE('Screens'); await figma.setCurrentPageAsync(page);
const COMPS = PAGE('Components');
const CS = (n) => COMPS.findOne(x => (x.type === 'COMPONENT_SET' || x.type === 'COMPONENT') && x.name === n);
const variant = (setName, props) => { const s = CS(setName); return s.type === 'COMPONENT' ? s : s.children.find(c => Object.entries(props).every(([k, v]) => c.name.includes(`${k}=${v}`))); };
const setProps = (inst, props) => { const map = {}; for (const [k, v] of Object.entries(props)) { const key = Object.keys(inst.componentProperties).find(p => p.split('#')[0] === k); if (key) map[key] = v; } inst.setProperties(map); return inst; };
const section = page.findOne(n => n.type === 'SECTION' && n.name === 'iOS Screens');
async function statusBar(parent, dark = false) {
  try { const sb = await figma.importComponentByKeyAsync('51ddb19de206b67eae2d554b1d20c018feb754f4'); const i = sb.createInstance(); parent.appendChild(i); i.x = 0; i.y = 0; i.resize(402, i.height); return i; }
  catch (e) { const t = await text('9:41', 'Web/Headline', dark ? 'text/onPhoto' : 'text/primary', { weight: 'Semi Bold', name: 'Status bar' }); parent.appendChild(t); t.x = 32; t.y = 18; return t; }
}
function screen(name, bg = 'bg/canvas') { const f = figma.createFrame(); f.name = name; f.resize(402, 874); f.clipsContent = true; fill(f, bg); section.appendChild(f); return f; }
function tabBar(parent, active) { const i = variant('Glass Tab Bar', { Active: active }).createInstance(); parent.appendChild(i); i.x = 16; i.y = 874 - 16 - 64; return i; }
const homeIndicator = (parent) => { const r = figma.createRectangle(); r.name = 'Home indicator'; r.resize(139, 5); r.cornerRadius = 3; fill(r, 'text/primary'); parent.appendChild(r); r.x = (402 - 139) / 2; r.y = 874 - 13; };
const out = {};

// ---------- MAP ----------
{
  const f = screen('Map'); f.x = 20 + 470 * 2; f.y = 60; f.fills = [{ type: 'SOLID', color: hx('#EFE9E0') }];
  const mapSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 402 874" width="402" height="874"><rect width="402" height="874" fill="#EFE9E0"/><g fill="#E3EEDD"><rect x="30" y="120" width="120" height="90" rx="12"/><rect x="260" y="540" width="110" height="80" rx="12"/><rect x="60" y="620" width="90" height="70" rx="12"/></g><g fill="#E6DCD0"><rect x="185" y="150" width="90" height="60" rx="4"/><rect x="205" y="390" width="70" height="50" rx="4"/><rect x="40" y="390" width="110" height="60" rx="4"/></g><g stroke="#FFFFFF" stroke-width="6" fill="none" stroke-linecap="round"><path d="M0 270h402M0 486h402M0 724h402M92 0v874M300 0v874M196 0v874"/></g><g stroke="#FFFFFF" stroke-width="3" fill="none"><path d="M0 352h402M0 620h402M144 0v874M350 0v874M41 0v874"/></g><g stroke="#F5D9A6" stroke-width="10" fill="none" stroke-linecap="round"><path d="M-10 93c124 41 186 124 247 269s82 269 175 393"/></g><g stroke="#E8871E" stroke-width="3" fill="none" stroke-dasharray="10 8" opacity="0.5"><path d="M-10 93c124 41 186 124 247 269s82 269 175 393"/></g></svg>`;
  const map = figma.createNodeFromSvg(mapSvg); map.name = 'Basemap'; f.appendChild(map); map.x = 0; map.y = 0;
  // proximity ring + user dot
  const ring = figma.createEllipse(); ring.name = 'Proximity'; ring.resize(186, 186); ring.x = 155 - 93; ring.y = 310 - 93; ring.fills = [{ type: 'SOLID', color: hx('#E8871E'), opacity: 0.10 }]; ring.strokes = [{ type: 'SOLID', color: hx('#E8871E'), opacity: 0.45 }]; ring.strokeWeight = 1.5; f.appendChild(ring);
  const dot = figma.createEllipse(); dot.name = 'You'; dot.resize(18, 18); dot.x = 155 - 9; dot.y = 310 - 9; dot.fills = [{ type: 'SOLID', color: hx('#2C6BA3') }]; dot.strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; dot.strokeWeight = 3; dot.effects = [{ type: 'DROP_SHADOW', color: { ...hx('#2C6BA3'), a: 0.2 }, offset: { x: 0, y: 0 }, radius: 0, spread: 6, visible: true, blendMode: 'NORMAL' }]; f.appendChild(dot);
  const pins = [['today', 218, 254], ['now', 99, 384], ['upcoming', 346, 132], ['recurring', 258, 434], ['upcoming', 124, 578], ['recurring', 340, 662], ['cluster', 62, 228, '3'], ['cluster', 330, 486, '5']];
  for (const [state, cx, cy, count] of pins) { const i = variant('Map Pin', { State: state }).createInstance(); f.appendChild(i); i.x = cx - i.width / 2; i.y = cy - i.height / 2; if (count) setProps(i, { Count: count }); if (state === 'today') { i.rescale(1.2); i.x = cx - i.width / 2; i.y = cy - i.height / 2; } }
  // callout
  const callout = figma.createAutoLayout('VERTICAL', { name: 'Callout', itemSpacing: 1 }); pad(callout, 8, 12, 8, 12); radius(callout, 'radius/md'); glass(callout, 'regular');
  callout.appendChild(await text('Sunrise Coffee & Cars', 'Web/Footnote', 'text/primary', { weight: 'Semi Bold' })); callout.appendChild(await text('Today 7:00am · 4.2 mi · 42 going', 'Web/Caption 1', 'text/secondary', { weight: 'Regular' }));
  f.appendChild(callout); callout.x = 218 - callout.width / 2; callout.y = 172;
  const tb = variant('Glass Toolbar', { Type: 'Map' }).createInstance(); f.appendChild(tb); tb.x = 16; tb.y = 62;
  const sb = CS('Bottom Search Bar').createInstance(); f.appendChild(sb); sb.x = 16; sb.y = 874 - 96 - sb.height;
  await statusBar(f); tabBar(f, 'Map'); homeIndicator(f);
  out.map = f.id;
}

// ---------- EVENT DETAIL ----------
{
  const f = screen('Event Detail'); f.x = 20 + 470 * 3; f.y = 60;
  const hero = figma.createFrame(); hero.name = 'Hero'; hero.resize(402, 330); hero.clipsContent = true; hero.fills = []; f.appendChild(hero);
  const img = variant('Photo Placeholder', { Tone: 'Dawn' }).createInstance(); hero.appendChild(img); img.resize(440, 330); img.x = -19;
  const scrim = figma.createRectangle(); scrim.name = 'Scrim'; scrim.resize(402, 200); scrim.y = 130; hero.appendChild(scrim);
  scrim.fills = [{ type: 'GRADIENT_LINEAR', gradientTransform: [[0,1,0],[-1,0,1]], gradientStops: [{ position: 0, color: { ...hx('#141110'), a: 0 } }, { position: 1, color: { ...hx('#141110'), a: 0.72 } }] }];
  const heroText = figma.createAutoLayout('VERTICAL', { name: 'Title block', itemSpacing: 8 }); f.appendChild(heroText); heroText.x = 16; heroText.y = 230; heroText.resize(370, 80); heroText.primaryAxisSizingMode = 'AUTO'; heroText.counterAxisSizingMode = 'FIXED';
  const badges = figma.createAutoLayout('HORIZONTAL', { name: 'Badges', itemSpacing: 8 }); heroText.appendChild(badges);
  badges.appendChild(variant('Status Badge', { Kind: 'Today' }).createInstance());
  const rec = figma.createAutoLayout('HORIZONTAL', { name: 'Every Saturday', itemSpacing: 6, counterAxisAlignItems: 'CENTER' }); pad(rec, 0, 10, 0, 10); rec.resize(60, 26); rec.counterAxisSizingMode = 'FIXED'; radius(rec, 'radius/chip'); glass(rec, 'dark'); rec.fills = [{ type: 'SOLID', color: hx('#1E1917'), opacity: 0.42 }];
  rec.appendChild(icon('repeat', 'text/onPhoto', 18)); rec.appendChild(await text('Every Saturday', 'Web/Caption 1', 'text/onPhoto')); badges.appendChild(rec);
  const title = await text('Sunrise Coffee & Cars', 'Web/Title 1', 'text/onPhoto'); heroText.appendChild(title); title.layoutSizingHorizontal = 'FILL';
  const tb = variant('Glass Toolbar', { Type: 'Detail' }).createInstance(); f.appendChild(tb); tb.x = 16; tb.y = 58;
  // body
  const body = figma.createAutoLayout('VERTICAL', { name: 'Body', itemSpacing: 0 }); pad(body, 4, 0, 160, 0); f.appendChild(body); body.x = 0; body.y = 330; body.resize(402, 500); body.primaryAxisSizingMode = 'AUTO'; body.counterAxisSizingMode = 'FIXED'; fill(body, 'bg/canvas');
  const row = async (ic, t1, t2, trailing) => { const r = figma.createAutoLayout('HORIZONTAL', { name: t1, itemSpacing: 12, counterAxisAlignItems: 'CENTER' }); pad(r, 9, 16, 9, 16); body.appendChild(r); r.layoutSizingHorizontal = 'FILL';
    const ib = figma.createAutoLayout('HORIZONTAL', { primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER', name: 'Icon' }); ib.resize(36, 36); ib.primaryAxisSizingMode = 'FIXED'; ib.counterAxisSizingMode = 'FIXED'; radius(ib, 'radius/sm'); fill(ib, 'bg/surfaceSecondary'); ib.appendChild(icon(ic, 'accent/text', 18)); r.appendChild(ib);
    const col = figma.createAutoLayout('VERTICAL', { itemSpacing: 1, name: 'Text' }); col.appendChild(await text(t1, 'Web/Callout', 'text/primary', { weight: 'Medium' })); const s = await text(t2, 'Web/Footnote', 'text/secondary'); col.appendChild(s); r.appendChild(col); col.layoutSizingHorizontal = 'FILL'; s.layoutSizingHorizontal = 'FILL'; s.textTruncation = 'ENDING'; s.maxLines = 1;
    r.appendChild(icon(trailing, 'icon/muted', 18)); };
  await row('clock', 'Saturday, Sep 6 · 7:00 to 10:00am', 'Starts in 14 hours', 'calendar');
  await row('pin', 'Victoria Gardens, north lot', '12505 N Mainstreet, Rancho Cucamonga · 4.2 mi', 'directions');
  await row('person-circle', 'Hosted by IE Sunrise Meets', '2,140 followers · 3 meets a month', 'chevron-right');
  const going = figma.createAutoLayout('VERTICAL', { name: "Who's going", itemSpacing: 10 }); pad(going, 14, 16, 14, 16); fill(going, 'bg/surface'); radius(going, 'radius/card'); going.effectStyleId = ES('Shadow/Card').id;
  const gw = figma.createAutoLayout('VERTICAL', { name: 'wrap' }); pad(gw, 6, 16, 0, 16); body.appendChild(gw); gw.layoutSizingHorizontal = 'FILL'; gw.appendChild(going); going.layoutSizingHorizontal = 'FILL';
  const gh = figma.createAutoLayout('HORIZONTAL', { primaryAxisAlignItems: 'SPACE_BETWEEN', name: 'head' }); going.appendChild(gh); gh.layoutSizingHorizontal = 'FILL'; gh.appendChild(await text("Who's going", 'Web/Headline', 'text/primary')); gh.appendChild(await text('See all', 'Web/Subheadline', 'accent/text', { weight: 'Semi Bold', size: 14 }));
  const gr = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, counterAxisAlignItems: 'CENTER', name: 'avatars' }); gr.appendChild(avatarStack(6, 32)); gr.appendChild(await text('42 going · 3 people you follow', 'Web/Footnote', 'text/secondary', { weight: 'Medium' })); going.appendChild(gr);
  const desc = figma.createAutoLayout('VERTICAL', { name: 'Description', itemSpacing: 8 }); pad(desc, 12, 16, 0, 16); body.appendChild(desc); desc.layoutSizingHorizontal = 'FILL';
  const d = await text('Bring whatever you drive. Coffee from the Starbucks on Mainstreet, overflow parking by the theater. Please no burnouts leaving the lot.', 'Web/Callout', 'text/primary'); desc.appendChild(d); d.layoutSizingHorizontal = 'FILL'; d.textAutoResize = 'HEIGHT';
  const src = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 6, counterAxisAlignItems: 'CENTER', name: 'Source' }); src.appendChild(icon('link', 'text/secondary', 18)); src.appendChild(await text('Imported from Evite · ', 'Web/Footnote', 'text/secondary')); src.appendChild(await text('Open original', 'Web/Footnote', 'link')); desc.appendChild(src);
  const photos = figma.createAutoLayout('HORIZONTAL', { name: 'Photos', itemSpacing: 8 }); pad(photos, 14, 0, 0, 16); body.appendChild(photos);
  for (const tone of ['Dusk', 'Sky', 'Mist', 'Dawn']) { const p = figma.createFrame(); p.resize(110, 110); p.clipsContent = true; p.fills = []; radius(p, 'radius/md'); const i = variant('Photo Placeholder', { Tone: tone }).createInstance(); p.appendChild(i); i.resize(147, 110); i.x = -18; photos.appendChild(p); }
  // bottom action bar
  const fade = figma.createRectangle(); fade.name = 'Bottom fade'; fade.resize(402, 150); fade.y = 874 - 150; f.appendChild(fade);
  fade.fills = [{ type: 'GRADIENT_LINEAR', gradientTransform: [[0,1,0],[-1,0,1]], gradientStops: [{ position: 0, color: { ...hx('#FBF7F1'), a: 0 } }, { position: 0.6, color: { ...hx('#FBF7F1'), a: 1 } }] }];
  const bar = figma.createAutoLayout('HORIZONTAL', { name: 'Actions', itemSpacing: 10 }); f.appendChild(bar); bar.x = 16; bar.y = 874 - 18 - 64; bar.resize(370, 64); bar.primaryAxisSizingMode = 'FIXED'; bar.counterAxisSizingMode = 'FIXED';
  const gib = CS('Glass Icon Button');
  for (const ic of ['camera', 'comment']) { const b = gib.createInstance(); bar.appendChild(b); b.resize(64, 64); setProps(b, { Icon: ICON(ic).id }); }
  const cta = variant('Button', { Style: 'Primary', Size: 'Large' }).createInstance(); bar.appendChild(cta); cta.layoutSizingHorizontal = 'FILL'; cta.resize(cta.width, 64); glass(cta, 'tinted');
  await statusBar(f, true); homeIndicator(f);
  out.detail = f.id;
}

// ---------- CREATE FROM LINK (step 1 sheet) ----------
{
  const f = screen('Create from link', 'bg/surfaceSecondary'); f.x = 20 + 470 * 4; f.y = 60;
  const bgImg = variant('Photo Placeholder', { Tone: 'Dusk' }).createInstance(); f.appendChild(bgImg); bgImg.resize(402, 874); bgImg.opacity = 0.35;
  const sheet = figma.createAutoLayout('VERTICAL', { name: 'Sheet', itemSpacing: 0 }); f.appendChild(sheet); sheet.x = 0; sheet.y = 64; sheet.resize(402, 810); sheet.primaryAxisSizingMode = 'FIXED'; sheet.counterAxisSizingMode = 'FIXED'; sheet.counterAxisAlignItems = 'CENTER';
  fill(sheet, 'bg/canvas'); sheet.topLeftRadius = 32; sheet.topRightRadius = 32; sheet.setBoundVariable('topLeftRadius', V('Radius', 'radius/sheet')); sheet.setBoundVariable('topRightRadius', V('Radius', 'radius/sheet'));
  sheet.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.3 }, offset: { x: 0, y: -8 }, radius: 32, spread: 0, visible: true, blendMode: 'NORMAL' }];
  const grabber = figma.createRectangle(); grabber.resize(36, 5); grabber.cornerRadius = 3; grabber.fills = [{ type: 'SOLID', color: hx('#D8CFC4') }]; sheet.appendChild(grabber); pad(sheet, 8, 0, 0, 0);
  const nav = figma.createAutoLayout('HORIZONTAL', { name: 'Nav', primaryAxisAlignItems: 'SPACE_BETWEEN', counterAxisAlignItems: 'CENTER' }); pad(nav, 0, 16, 0, 16); sheet.appendChild(nav); nav.layoutSizingHorizontal = 'FILL'; nav.resize(402, 56); nav.counterAxisSizingMode = 'FIXED';
  nav.appendChild(await text('Cancel', 'Web/Subheadline', 'accent/text', { weight: 'Medium' }));
  const nt = figma.createAutoLayout('VERTICAL', { counterAxisAlignItems: 'CENTER', name: 'Title' }); nt.appendChild(await text('New meet', 'Web/Headline', 'text/primary')); nt.appendChild(await text('Step 1 of 2', 'Web/Caption 1', 'text/tertiary', { weight: 'Regular' })); nav.appendChild(nt);
  const spacer = await text('Cancel', 'Web/Subheadline', 'accent/text'); spacer.opacity = 0; nav.appendChild(spacer);
  const content = figma.createAutoLayout('VERTICAL', { name: 'Content', itemSpacing: 16 }); pad(content, 8, 16, 0, 16); sheet.appendChild(content); content.layoutSizingHorizontal = 'FILL';
  const intro = figma.createAutoLayout('VERTICAL', { itemSpacing: 4, name: 'Intro' }); content.appendChild(intro); intro.layoutSizingHorizontal = 'FILL';
  intro.appendChild(await text('Paste a link', 'Web/Title 2', 'text/primary')); const sub = await text("Already posted it somewhere? We'll pull in the details so you don't type them twice.", 'Web/Subheadline', 'text/secondary'); intro.appendChild(sub); sub.layoutSizingHorizontal = 'FILL'; sub.textAutoResize = 'HEIGHT';
  const fieldWrap = figma.createAutoLayout('VERTICAL', { itemSpacing: 8, name: 'Link field' }); content.appendChild(fieldWrap); fieldWrap.layoutSizingHorizontal = 'FILL';
  const field = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 10, counterAxisAlignItems: 'CENTER', name: 'Input' }); pad(field, 0, 14, 0, 14); fieldWrap.appendChild(field); field.layoutSizingHorizontal = 'FILL'; field.resize(370, 52); field.counterAxisSizingMode = 'FIXED'; fill(field, 'bg/surface'); stroke(field, 'border/focus', 1.5); field.cornerRadius = 16;
  field.effects = [{ type: 'DROP_SHADOW', color: { ...hx('#E8871E'), a: 0.15 }, offset: { x: 0, y: 0 }, radius: 0, spread: 4, visible: true, blendMode: 'NORMAL' }];
  field.appendChild(icon('link', 'accent/text', 18)); const url = await text('https://www.evite.com/event/0179ZSUNRISE7AM', 'Web/Subheadline', 'text/primary'); field.appendChild(url); url.layoutSizingHorizontal = 'FILL'; url.textTruncation = 'ENDING'; url.maxLines = 1;
  const clear = figma.createAutoLayout('HORIZONTAL', { primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER', name: 'Clear' }); clear.resize(28, 28); clear.primaryAxisSizingMode = 'FIXED'; clear.counterAxisSizingMode = 'FIXED'; radius(clear, 'radius/pill'); fill(clear, 'bg/surfaceSecondary'); clear.appendChild(icon('x', 'text/secondary', 14)); field.appendChild(clear);
  const ok = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 6, counterAxisAlignItems: 'CENTER', name: 'Recognized' }); ok.appendChild(icon('check-circle', 'status/success/text', 16)); ok.appendChild(await text('Evite link recognized', 'Web/Footnote', 'status/success/text', { weight: 'Medium' })); fieldWrap.appendChild(ok);
  const cta = variant('Button', { Style: 'Primary', Size: 'Large' }).createInstance(); content.appendChild(cta); cta.layoutSizingHorizontal = 'FILL'; setProps(cta, { Label: 'Import details', Icon: ICON('sparkle').id });
  const works = figma.createAutoLayout('VERTICAL', { itemSpacing: 10, name: 'Works with' }); pad(works, 8, 0, 0, 0); content.appendChild(works); works.layoutSizingHorizontal = 'FILL';
  const wl = await text('WORKS WITH', 'Web/Footnote', 'text/tertiary', { weight: 'Semi Bold' }); wl.letterSpacing = { unit: 'PIXELS', value: 0.4 }; works.appendChild(wl);
  const chips = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, counterAxisSpacing: 8, name: 'Chips' }); chips.layoutWrap = 'WRAP'; works.appendChild(chips); chips.layoutSizingHorizontal = 'FILL';
  for (const l of ['Evite', 'Eventbrite', 'Meetup', 'Facebook Events', 'Instagram post', 'Partiful', 'Flyer photo']) { const i = variant('Filter Chip', { Selected: 'False' }).createInstance(); chips.appendChild(i); setProps(i, { Label: l, 'Show Icon': l === 'Flyer photo' }); if (l === 'Flyer photo') setProps(i, { Icon: ICON('camera').id }); }
  const or = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12, counterAxisAlignItems: 'CENTER', name: 'or' }); pad(or, 4, 0, 0, 0); content.appendChild(or); or.layoutSizingHorizontal = 'FILL';
  for (const side of [0, 1]) { const ln = figma.createRectangle(); ln.resize(100, 1); fill(ln, 'border/default'); or.appendChild(ln); ln.layoutSizingHorizontal = 'FILL'; if (side === 0) or.appendChild(await text('or', 'Web/Footnote', 'text/tertiary')); }
  const manual = variant('Button', { Style: 'Secondary', Size: 'Large' }).createInstance(); content.appendChild(manual); manual.layoutSizingHorizontal = 'FILL'; manual.resize(manual.width, 52); setProps(manual, { Label: 'Fill it in by hand', 'Show Icon': false });
  await statusBar(f, true); homeIndicator(f);
  out.create = f.id;
}
section.resizeWithoutConstraints(20 + 470 * 5, 874 + 120);
return out;
