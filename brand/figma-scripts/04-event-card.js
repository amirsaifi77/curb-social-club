// 04 — Event Card: Layout=Feed (4:3 photo, title on scrim) | List (96px thumbnail row). Width 370 (402 - 2*16 gutter).
const page = PAGE('Components'); await figma.setCurrentPageAsync(page);
if (COMP('Event Card')) return { skipped: 'Event Card exists' };
const photoSet = COMP('Photo Placeholder');
const badgeSet = COMP('Status Badge');
const comps = [];

// Feed variant
{
  const c = figma.createComponent(); c.name = 'Layout=Feed';
  c.layoutMode = 'VERTICAL'; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; c.resize(370, 100); c.clipsContent = true;
  fill(c, 'bg/surface'); radius(c, 'radius/card'); c.effectStyleId = ES('Shadow/Card').id;
  // photo block
  const photo = figma.createFrame(); photo.name = 'Photo'; photo.resize(370, 278); photo.clipsContent = true; photo.fills = [];
  const img = photoSet.defaultVariant.createInstance(); img.name = 'Image'; photo.appendChild(img); img.resize(370, 278); img.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
  const scrim = figma.createRectangle(); scrim.name = 'Scrim'; scrim.resize(370, 120); scrim.y = 278 - 120; photo.appendChild(scrim);
  scrim.fills = [{ type: 'GRADIENT_LINEAR', gradientTransform: [[0,1,0],[-1,0,1]], gradientStops: [{ position: 0, color: { r: 20/255, g: 17/255, b: 16/255, a: 0 } }, { position: 1, color: { r: 20/255, g: 17/255, b: 16/255, a: 0.72 } }] }];
  scrim.constraints = { horizontal: 'STRETCH', vertical: 'MAX' };
  const badge = badgeSet.defaultVariant.createInstance(); badge.name = 'Badge'; photo.appendChild(badge); badge.x = 12; badge.y = 12;
  const title = await text('Sunrise Coffee & Cars', 'Web/Title 3', 'text/onPhoto', { weight: 'Bold', name: 'Title', width: 338 }); photo.appendChild(title); title.x = 16; title.y = 278 - 14 - title.height; title.constraints = { horizontal: 'STRETCH', vertical: 'MAX' };
  c.appendChild(photo); photo.layoutSizingHorizontal = 'FILL';
  // meta block
  const meta = figma.createAutoLayout('VERTICAL', { name: 'Meta', itemSpacing: 8 }); pad(meta, 12, 16, 14, 16); c.appendChild(meta); meta.layoutSizingHorizontal = 'FILL';
  const r1 = figma.createAutoLayout('HORIZONTAL', { name: 'Time', itemSpacing: 6, counterAxisAlignItems: 'CENTER' }); r1.appendChild(icon('clock', 'icon/muted', 18)); r1.appendChild(await text('Sat 7:00 to 10:00am', 'Web/Subheadline', 'text/primary', { weight: 'Medium', name: 'Time' })); meta.appendChild(r1);
  const r2 = figma.createAutoLayout('HORIZONTAL', { name: 'Place', itemSpacing: 6, counterAxisAlignItems: 'CENTER' }); r2.appendChild(icon('pin', 'icon/muted', 18));
  const place = await text('Victoria Gardens, Rancho Cucamonga', 'Web/Subheadline', 'text/secondary', { name: 'Place' }); r2.appendChild(place);
  r2.appendChild(await text('·', 'Web/Subheadline', 'text/tertiary')); r2.appendChild(await text('4.2 mi', 'Web/Subheadline', 'text/secondary', { name: 'Distance' }));
  meta.appendChild(r2); r2.layoutSizingHorizontal = 'FILL'; place.layoutSizingHorizontal = 'FILL'; place.textTruncation = 'ENDING'; place.maxLines = 1;
  const r3 = figma.createAutoLayout('HORIZONTAL', { name: 'Going', counterAxisAlignItems: 'CENTER', primaryAxisAlignItems: 'SPACE_BETWEEN' }); meta.appendChild(r3); r3.layoutSizingHorizontal = 'FILL';
  const left = figma.createAutoLayout('HORIZONTAL', { name: 'Count', itemSpacing: 8, counterAxisAlignItems: 'CENTER' }); left.appendChild(avatarStack(3, 26)); left.appendChild(await text('42 going', 'Web/Footnote', 'text/secondary', { weight: 'Medium', name: 'Going' })); r3.appendChild(left);
  const cta = figma.createAutoLayout('HORIZONTAL', { name: 'CTA', itemSpacing: 4, counterAxisAlignItems: 'CENTER' }); cta.appendChild(await text("I'm going", 'Web/Footnote', 'accent/text', { weight: 'Semi Bold' })); cta.appendChild(icon('chevron-right', 'accent/text', 18)); r3.appendChild(cta);
  // props
  const kT = c.addComponentProperty('Title', 'TEXT', 'Sunrise Coffee & Cars'); title.componentPropertyReferences = { characters: kT };
  const kTime = c.addComponentProperty('Time', 'TEXT', 'Sat 7:00 to 10:00am'); r1.children[1].componentPropertyReferences = { characters: kTime };
  const kP = c.addComponentProperty('Place', 'TEXT', 'Victoria Gardens, Rancho Cucamonga'); place.componentPropertyReferences = { characters: kP };
  const kD = c.addComponentProperty('Distance', 'TEXT', '4.2 mi'); r2.children[3].componentPropertyReferences = { characters: kD };
  const kG = c.addComponentProperty('Going', 'TEXT', '42 going'); left.children[1].componentPropertyReferences = { characters: kG };
  const kB = c.addComponentProperty('Show Badge', 'BOOLEAN', true); badge.componentPropertyReferences = { visible: kB };
  const kBadge = c.addComponentProperty('Badge', 'INSTANCE_SWAP', badgeSet.defaultVariant.id); badge.componentPropertyReferences = { visible: kB, mainComponent: kBadge };
  const kImg = c.addComponentProperty('Photo', 'INSTANCE_SWAP', photoSet.defaultVariant.id); img.componentPropertyReferences = { mainComponent: kImg };
  comps.push(c);
}

// List variant
{
  const c = figma.createComponent(); c.name = 'Layout=List';
  c.layoutMode = 'HORIZONTAL'; c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO'; c.resize(370, 120); c.itemSpacing = 12; pad(c, 12, 12, 12, 12);
  fill(c, 'bg/surface'); radius(c, 'radius/card'); c.effectStyleId = ES('Shadow/Card').id;
  const thumb = figma.createFrame(); thumb.name = 'Photo'; thumb.resize(96, 96); thumb.clipsContent = true; thumb.fills = []; radius(thumb, 'radius/md');
  const img = photoSet.defaultVariant.createInstance(); img.name = 'Image'; thumb.appendChild(img); img.resize(128, 96); img.x = -16; c.appendChild(thumb);
  const col = figma.createAutoLayout('VERTICAL', { name: 'Meta', itemSpacing: 4 }); c.appendChild(col); col.layoutSizingHorizontal = 'FILL';
  const tr = figma.createAutoLayout('HORIZONTAL', { name: 'Title row', itemSpacing: 8, counterAxisAlignItems: 'CENTER' }); col.appendChild(tr); tr.layoutSizingHorizontal = 'FILL';
  const title = await text('Sunrise Coffee & Cars', 'Web/Headline', 'text/primary', { name: 'Title' }); tr.appendChild(title); title.textTruncation = 'ENDING'; title.maxLines = 1;
  const badge = badgeSet.defaultVariant.createInstance(); badge.name = 'Badge'; tr.appendChild(badge); badge.resize(badge.width, 22);
  const time = await text('7:00 to 10:00am', 'Web/Subheadline', 'text/primary', { weight: 'Medium', name: 'Time', size: 14 }); col.appendChild(time);
  const place = await text('Victoria Gardens · 4.2 mi', 'Web/Subheadline', 'text/secondary', { name: 'Place', size: 14 }); col.appendChild(place); place.layoutSizingHorizontal = 'FILL'; place.textTruncation = 'ENDING'; place.maxLines = 1;
  const going = figma.createAutoLayout('HORIZONTAL', { name: 'Count', itemSpacing: 8, counterAxisAlignItems: 'CENTER' }); going.appendChild(avatarStack(3, 22)); going.appendChild(await text('42 going', 'Web/Footnote', 'text/secondary', { weight: 'Medium', name: 'Going' })); col.appendChild(going);
  const kT = c.addComponentProperty('Title', 'TEXT', 'Sunrise Coffee & Cars'); title.componentPropertyReferences = { characters: kT };
  const kTime = c.addComponentProperty('Time', 'TEXT', '7:00 to 10:00am'); time.componentPropertyReferences = { characters: kTime };
  const kP = c.addComponentProperty('Place', 'TEXT', 'Victoria Gardens · 4.2 mi'); place.componentPropertyReferences = { characters: kP };
  const kG = c.addComponentProperty('Going', 'TEXT', '42 going'); going.children[1].componentPropertyReferences = { characters: kG };
  const kB = c.addComponentProperty('Show Badge', 'BOOLEAN', true); const kBadge = c.addComponentProperty('Badge', 'INSTANCE_SWAP', badgeSet.defaultVariant.id); badge.componentPropertyReferences = { visible: kB, mainComponent: kBadge };
  const kImg = c.addComponentProperty('Photo', 'INSTANCE_SWAP', photoSet.defaultVariant.id); img.componentPropertyReferences = { mainComponent: kImg };
  comps.push(c);
}
const set = figma.combineAsVariants(comps, page); set.name = 'Event Card';
set.description = 'Photo-forward meet card. Feed = 4:3 photo with bottom scrim and title over the photo, metadata below on the surface. List = 96px thumbnail row. Radius 20, card shadow.';
layoutSet(set, 2); set.x = 0; set.y = nextY(page);
return { setId: set.id, variantIds: set.children.map(c => c.id) };
