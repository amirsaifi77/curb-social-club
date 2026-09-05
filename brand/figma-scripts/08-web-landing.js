// 08 — Screens page, "Web" section: 1440-wide landing page from Landing.dc.html (Inter, Web/* text styles)
const page = PAGE('Screens'); await figma.setCurrentPageAsync(page);
const COMPS = PAGE('Components');
const CS = (n) => COMPS.findOne(x => (x.type === 'COMPONENT_SET' || x.type === 'COMPONENT') && x.name === n);
const variant = (setName, props) => { const s = CS(setName); return s.type === 'COMPONENT' ? s : s.children.find(c => Object.entries(props).every(([k, v]) => c.name.includes(`${k}=${v}`))); };
const setProps = (inst, props) => { const map = {}; for (const [k, v] of Object.entries(props)) { const key = Object.keys(inst.componentProperties).find(p => p.split('#')[0] === k); if (key) map[key] = v; } inst.setProperties(map); return inst; };
let section = page.findOne(n => n.type === 'SECTION' && n.name === 'Web');
if (!section) { section = figma.createSection(); section.name = 'Web'; section.x = 0; section.y = 1100; section.resizeWithoutConstraints(1500, 2100); }
const f = figma.createFrame(); f.name = 'Landing 1440'; f.resize(1440, 1960); f.clipsContent = true; fill(f, 'bg/canvas'); section.appendChild(f); f.x = 30; f.y = 60;
// glow
const glow = figma.createEllipse(); glow.name = 'Morning glow'; glow.resize(760, 760); glow.x = 1440 - 760 + 160; glow.y = -220;
glow.fills = [{ type: 'GRADIENT_RADIAL', gradientTransform: [[0.5,0,0.25],[0,0.5,0.25]], gradientStops: [{ position: 0, color: { ...hx('#F5B865'), a: 0.55 } }, { position: 0.65, color: { ...hx('#F5B865'), a: 0 } }] }]; f.appendChild(glow);
const mark = () => { const m = PAGE('Foundations').findOne(n => n.name === 'Logo Mark').clone(); return m; };
const col = (x, y, w, name, gap = 0) => { const c = figma.createAutoLayout('VERTICAL', { name, itemSpacing: gap }); f.appendChild(c); c.x = x; c.y = y; c.resize(w, 10); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; return c; };
const darkBtn = async (label, ic, h = 56) => { const b = figma.createAutoLayout('HORIZONTAL', { name: label, itemSpacing: 10, counterAxisAlignItems: 'CENTER' }); pad(b, 0, h === 56 ? 22 : 18, 0, h === 56 ? 22 : 18); b.resize(100, h); b.counterAxisSizingMode = 'FIXED'; radius(b, 'radius/pill'); fill(b, 'bg/inverse'); if (ic) b.appendChild(icon(ic, 'text/inverse', h === 56 ? 24 : 18)); b.appendChild(await text(label, h === 56 ? 'Web/Headline' : 'Web/Subheadline', 'text/inverse', { weight: 'Semi Bold' })); return b; };

// NAV
const nav = figma.createAutoLayout('HORIZONTAL', { name: 'Nav', primaryAxisAlignItems: 'SPACE_BETWEEN', counterAxisAlignItems: 'CENTER' }); pad(nav, 0, 12, 0, 20); f.appendChild(nav); nav.x = 160; nav.y = 24; nav.resize(1120, 64); nav.primaryAxisSizingMode = 'FIXED'; nav.counterAxisSizingMode = 'FIXED'; radius(nav, 'radius/pill'); glass(nav, 'regular');
const brand = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 10, counterAxisAlignItems: 'CENTER', name: 'Brand' }); const m1 = mark(); m1.resize(32, 32); brand.appendChild(m1);
const bt = await text('Cars & Coffee', 'Web/Headline', 'text/primary', { weight: 'Bold', size: 18 }); bt.setRangeFills(5, 6, [paint(C('accent/fill'))]); brand.appendChild(bt); nav.appendChild(brand);
const links = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 32, name: 'Links' }); for (const l of ['Find a meet', 'Hosts', 'Add your meet']) links.appendChild(await text(l, 'Web/Subheadline', 'text/primary', { weight: 'Medium' })); nav.appendChild(links);
nav.appendChild(await darkBtn('Get the app', 'apple', 44));

// HERO
const hero = col(160, 190, 528, 'Hero', 28);
const loc = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 6, counterAxisAlignItems: 'CENTER', name: 'Region chip' }); pad(loc, 0, 14, 0, 14); loc.resize(60, 32); loc.counterAxisSizingMode = 'FIXED'; radius(loc, 'radius/chip'); fill(loc, 'accent/tint'); loc.appendChild(icon('pin', 'accent/text', 18)); loc.appendChild(await text('Inland Empire · OC · LA', 'Web/Footnote', 'accent/text', { weight: 'Medium' })); hero.appendChild(loc);
const h1 = await text('Find your Saturday morning.', 'Web/Large Title', 'text/primary', { size: 64 }); h1.lineHeight = { unit: 'PIXELS', value: 68 }; h1.letterSpacing = { unit: 'PIXELS', value: -2 }; hero.appendChild(h1); h1.layoutSizingHorizontal = 'FILL'; h1.textAutoResize = 'HEIGHT';
const p = await text('Every local car meet, on one map. Coffee meetups from Fontana to Irvine, from Miatas to McLarens. Browse without an account.', 'Web/Title 3', 'text/secondary', { weight: 'Regular' }); p.lineHeight = { unit: 'PIXELS', value: 30 }; hero.appendChild(p); p.layoutSizingHorizontal = 'FILL'; p.textAutoResize = 'HEIGHT';
const ctas = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 14, counterAxisAlignItems: 'CENTER', name: 'CTAs' }); ctas.appendChild(await darkBtn('Download on the App Store', 'apple'));
const lnk = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 4, counterAxisAlignItems: 'CENTER', name: 'Browse link' }); lnk.appendChild(await text('Browse meets on the web', 'Web/Headline', 'accent/text')); lnk.appendChild(icon('chevron-right', 'accent/text', 18)); ctas.appendChild(lnk); hero.appendChild(ctas);
const social = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 12, counterAxisAlignItems: 'CENTER', name: 'Social proof' }); social.appendChild(avatarStack(5, 32)); social.appendChild(await text('[GOING COUNT] people going this weekend', 'Web/Subheadline', 'text/secondary')); hero.appendChild(social);

// PHONE MOCK with Map screen instance
const phone = figma.createFrame(); phone.name = 'Phone'; phone.resize(360, 700); phone.cornerRadius = 52; fill(phone, 'bg/inverse'); phone.fills = [{ type: 'SOLID', color: hx('#1E1917') }]; f.appendChild(phone); phone.x = 160 + 528 + 64 + (528 - 360) / 2; phone.y = 160;
phone.effects = [{ type: 'DROP_SHADOW', color: { ...hx('#2A1A10'), a: 0.35 }, offset: { x: 0, y: 30 }, radius: 80, spread: 0, visible: true, blendMode: 'NORMAL' }];
const screenHole = figma.createFrame(); screenHole.name = 'Screen'; screenHole.resize(336, 676); screenHole.cornerRadius = 42; screenHole.clipsContent = true; screenHole.x = 12; screenHole.y = 12; phone.appendChild(screenHole);
const mapScreen = page.findOne(n => n.type === 'FRAME' && n.name === 'Map' && n.parent && n.parent.name === 'iOS Screens');
if (mapScreen) { const mc = mapScreen.clone(); screenHole.appendChild(mc); mc.x = 0; mc.y = 0; mc.rescale(336 / 402); }
else { const ph = variant('Photo Placeholder', { Tone: 'Sky' }).createInstance(); screenHole.appendChild(ph); ph.resize(336, 676); }

// FOR HOSTS
const hosts = col(160, 960, 1120, 'For hosts', 32);
const hh = figma.createAutoLayout('VERTICAL', { itemSpacing: 10, name: 'Heading' }); hosts.appendChild(hh); hh.resize(640, 10); hh.counterAxisSizingMode = 'FIXED'; hh.primaryAxisSizingMode = 'AUTO';
const eyebrow = await text('FOR HOSTS', 'Web/Footnote', 'accent/text', { weight: 'Semi Bold' }); eyebrow.letterSpacing = { unit: 'PIXELS', value: 0.4 }; hh.appendChild(eyebrow);
const h2 = await text('Already posted your meet? Paste the link.', 'Web/Large Title', 'text/primary', { size: 40 }); h2.lineHeight = { unit: 'PIXELS', value: 46 }; h2.letterSpacing = { unit: 'PIXELS', value: -1 }; hh.appendChild(h2); h2.layoutSizingHorizontal = 'FILL'; h2.textAutoResize = 'HEIGHT';
const hp = await text('Keep organizing on Evite, Instagram, or Facebook. We read the link, draft the listing, and send people back to your original post.', 'Web/Body', 'text/secondary', { size: 18 }); hp.lineHeight = { unit: 'PIXELS', value: 28 }; hh.appendChild(hp); hp.layoutSizingHorizontal = 'FILL'; hp.textAutoResize = 'HEIGHT';
const steps = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 20, name: 'Steps' }); hosts.appendChild(steps); steps.layoutSizingHorizontal = 'FILL';
for (const [ic, n, t, d] of [['link', 'STEP 1', 'Paste a link', 'Evite, Eventbrite, Meetup, Facebook Events, Instagram, Partiful, or a photo of the flyer.'], ['seal-check', 'STEP 2', 'Check the draft', 'Title, time, place, and host come in with a confidence tag on each. Fix what we got wrong in a tap.'], ['pin', 'STEP 3', 'Post it', 'Your meet shows up on the map and in feeds nearby, with a link back to where you posted it first.']]) {
  const card = figma.createAutoLayout('VERTICAL', { itemSpacing: 14, name: t }); pad(card, 28, 28, 28, 28); fill(card, 'bg/surface'); radius(card, 'radius/xl'); card.cornerRadius = 24; card.effectStyleId = ES('Shadow/Card').id; steps.appendChild(card); card.layoutSizingHorizontal = 'FILL';
  const ib = figma.createAutoLayout('HORIZONTAL', { primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER', name: 'Icon' }); ib.resize(48, 48); ib.primaryAxisSizingMode = 'FIXED'; ib.counterAxisSizingMode = 'FIXED'; ib.cornerRadius = 16; fill(ib, 'accent/tint'); ib.appendChild(icon(ic, 'accent/text', 24)); card.appendChild(ib);
  const sn = await text(n, 'Web/Footnote', 'text/tertiary', { weight: 'Semi Bold' }); sn.letterSpacing = { unit: 'PIXELS', value: 0.4 }; card.appendChild(sn);
  card.appendChild(await text(t, 'Web/Title 2', 'text/primary'));
  const dd = await text(d, 'Web/Callout', 'text/secondary'); dd.lineHeight = { unit: 'PIXELS', value: 24 }; card.appendChild(dd); dd.layoutSizingHorizontal = 'FILL'; dd.textAutoResize = 'HEIGHT';
}

// BAND: promise card + photo
const band = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 20, name: 'Band' }); f.appendChild(band); band.x = 160; band.y = 1480; band.resize(1120, 260); band.primaryAxisSizingMode = 'FIXED'; band.counterAxisSizingMode = 'FIXED';
const promise = figma.createAutoLayout('VERTICAL', { primaryAxisAlignItems: 'SPACE_BETWEEN', itemSpacing: 16, name: 'Promise' }); pad(promise, 28, 28, 28, 28); promise.cornerRadius = 24; fill(promise, 'bg/inverse'); band.appendChild(promise); promise.layoutSizingHorizontal = 'FILL'; promise.layoutSizingVertical = 'FILL'; promise.resize(360, 260);
const m2 = PAGE('Foundations').findOne(n => n.name === 'Logo Mark Dark').clone(); m2.resize(40, 40); promise.appendChild(m2);
const pt = figma.createAutoLayout('VERTICAL', { itemSpacing: 8, name: 'Text' }); promise.appendChild(pt); pt.layoutSizingHorizontal = 'FILL';
const pt1 = await text('Bring whatever you drive.', 'Web/Title 2', 'text/inverse', { size: 24 }); pt1.lineHeight = { unit: 'PIXELS', value: 30 }; pt.appendChild(pt1); pt1.layoutSizingHorizontal = 'FILL'; pt1.textAutoResize = 'HEIGHT';
const pt2 = await text('Daily beaters, project cars, and the occasional supercar park in the same lot here.', 'Web/Subheadline', 'text/secondary'); pt2.fills = [paint(C('pin/past'))]; pt2.lineHeight = { unit: 'PIXELS', value: 22 }; pt.appendChild(pt2); pt2.layoutSizingHorizontal = 'FILL'; pt2.textAutoResize = 'HEIGHT';
const photo = figma.createFrame(); photo.name = 'Feature photo'; photo.resize(740, 260); photo.cornerRadius = 24; photo.clipsContent = true; photo.fills = []; band.appendChild(photo); photo.layoutSizingHorizontal = 'FILL'; photo.layoutSizingVertical = 'FILL';
const pi = variant('Photo Placeholder', { Tone: 'Sky' }).createInstance(); photo.appendChild(pi); pi.resize(740, 555); pi.y = -150; pi.constraints = { horizontal: 'STRETCH', vertical: 'MAX' };
const sc = figma.createRectangle(); sc.resize(740, 140); sc.y = 120; sc.fills = [{ type: 'GRADIENT_LINEAR', gradientTransform: [[0,1,0],[-1,0,1]], gradientStops: [{ position: 0, color: { ...hx('#141110'), a: 0 } }, { position: 1, color: { ...hx('#141110'), a: 0.72 } }] }]; photo.appendChild(sc); sc.constraints = { horizontal: 'STRETCH', vertical: 'MAX' };
const cap = figma.createAutoLayout('VERTICAL', { itemSpacing: 4, name: 'Caption' }); photo.appendChild(cap); cap.x = 24; cap.y = 260 - 22 - 52; cap.appendChild(await text('Sunrise Coffee & Cars', 'Web/Title 2', 'text/onPhoto')); const c2 = await text('Victoria Gardens · Every Saturday 7 to 10am', 'Web/Subheadline', 'text/onPhoto'); c2.opacity = 0.85; cap.appendChild(c2); cap.constraints = { horizontal: 'MIN', vertical: 'MAX' };

// FOOTER
const footer = figma.createAutoLayout('HORIZONTAL', { primaryAxisAlignItems: 'SPACE_BETWEEN', counterAxisAlignItems: 'CENTER', name: 'Footer' }); pad(footer, 28, 0, 0, 0); f.appendChild(footer); footer.x = 160; footer.y = 1800; footer.resize(1120, 60); footer.primaryAxisSizingMode = 'FIXED'; footer.counterAxisSizingMode = 'AUTO'; footer.strokes = [paint(C('border/default'))]; footer.strokeWeight = 1; footer.strokeTopWeight = 1; footer.strokeBottomWeight = 0; footer.strokeLeftWeight = 0; footer.strokeRightWeight = 0;
const fb = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 8, counterAxisAlignItems: 'CENTER', name: 'Brand' }); const m3 = mark(); m3.resize(24, 24); fb.appendChild(m3); fb.appendChild(await text('Cars & Coffee', 'Web/Subheadline', 'text/primary', { weight: 'Semi Bold', size: 14 })); fb.appendChild(await text('· Built in Fontana, CA', 'Web/Subheadline', 'text/tertiary', { size: 14 })); footer.appendChild(fb);
const fl = figma.createAutoLayout('HORIZONTAL', { itemSpacing: 24, name: 'Links' }); for (const l of ['Add your meet', 'Hosts', 'Privacy', 'Contact']) fl.appendChild(await text(l, 'Web/Subheadline', 'text/secondary', { size: 14 })); footer.appendChild(fl);
section.resizeWithoutConstraints(1500, 2080);
return { landingId: f.id };
