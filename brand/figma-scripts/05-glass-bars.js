// 05 — Glass Icon Button, Glass Tab Bar (Active=Feed|Map|Activity|Profile) with trailing tinted Create button, Glass Toolbar (Type=Map|Detail|Feed), Bottom Search Bar
const page = PAGE('Components'); await figma.setCurrentPageAsync(page);
const out = {};

// Glass Icon Button — 44x44 circular glass with an icon slot
if (!COMP('Glass Icon Button')) {
  const c = figma.createComponent(); c.name = 'Glass Icon Button';
  c.layoutMode = 'HORIZONTAL'; c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'; c.resize(44, 44);
  c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'; radius(c, 'radius/pill'); glass(c, 'regular');
  c.setBoundVariable('width', V('Spacing', 'layout/minTouchTarget')); c.setBoundVariable('height', V('Spacing', 'layout/minTouchTarget'));
  const ic = icon('sliders', 'icon/default', 24); ic.name = 'Icon'; c.appendChild(ic);
  const k = c.addComponentProperty('Icon', 'INSTANCE_SWAP', ICON('sliders').id); ic.componentPropertyReferences = { mainComponent: k };
  c.x = 0; c.y = nextY(page); out.glassIconButton = c.id;
}

// Glass Tab Bar — iOS 26 floating pill, 4 tabs, Create as trailing tinted glass accessory
if (!COMP('Glass Tab Bar')) {
  const tabs = [['Feed', 'house', 'house-fill'], ['Map', 'map', 'map-fill'], ['Activity', 'bell', 'bell'], ['Profile', 'person-circle', 'person-circle']];
  const comps = [];
  for (const [active] of tabs) {
    const c = figma.createComponent(); c.name = `Active=${active}`;
    c.layoutMode = 'HORIZONTAL'; c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'; c.resize(370, 64); c.itemSpacing = 10; c.counterAxisAlignItems = 'CENTER';
    c.setBoundVariable('height', V('Spacing', 'layout/tabBarHeight'));
    const pill = figma.createAutoLayout('HORIZONTAL', { name: 'Pill', primaryAxisAlignItems: 'SPACE_BETWEEN', counterAxisAlignItems: 'CENTER' }); pad(pill, 0, 6, 0, 6);
    c.appendChild(pill); pill.layoutSizingHorizontal = 'FILL'; pill.layoutSizingVertical = 'FILL'; radius(pill, 'radius/pill'); glass(pill, 'regular');
    for (const [name, ic, icFill] of tabs) {
      const isActive = name === active;
      const tab = figma.createAutoLayout('VERTICAL', { name: 'Tab/' + name, itemSpacing: 2, primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' });
      tab.resize(64, 52); tab.primaryAxisSizingMode = 'FIXED'; tab.counterAxisSizingMode = 'FIXED';
      tab.appendChild(icon(isActive ? icFill : ic, isActive ? 'accent/text' : 'text/secondary', 24));
      tab.appendChild(await text(name, 'Web/Caption 2', isActive ? 'accent/text' : 'text/secondary', { weight: isActive ? 'Semi Bold' : 'Medium' }));
      pill.appendChild(tab);
    }
    const create = figma.createAutoLayout('HORIZONTAL', { name: 'Create', primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' });
    create.resize(64, 64); create.primaryAxisSizingMode = 'FIXED'; create.counterAxisSizingMode = 'FIXED'; radius(create, 'radius/pill'); glass(create, 'tinted');
    create.appendChild(icon('plus', 'accent/onAccent', 24)); c.appendChild(create);
    comps.push(c);
  }
  const set = figma.combineAsVariants(comps, page); set.name = 'Glass Tab Bar';
  set.description = 'iOS 26 floating tab bar: glass pill inset 16pt from the bottom with Feed, Map, Activity, Profile, plus Create as the trailing tinted-glass accessory button. Glass = translucent fill + 1px border + background blur + 1px inner highlight. Content scrolls under it (tabBarInset 88).';
  layoutSet(set, 1); set.x = 0; set.y = nextY(page); out.tabBar = set.id;
}

// Glass Toolbar — Map (location pill + locate + list), Detail (back + share), Feed (large title + filter)
if (!COMP('Glass Toolbar')) {
  const gib = COMP('Glass Icon Button');
  const comps = [];
  const mkBtn = (ic) => { const b = gib.createInstance(); const k = Object.keys(b.componentProperties).find(k => k.startsWith('Icon')); b.setProperties({ [k]: ICON(ic).id }); return b; };
  for (const type of ['Map', 'Detail', 'Feed']) {
    const c = figma.createComponent(); c.name = `Type=${type}`;
    c.layoutMode = 'HORIZONTAL'; c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO'; c.resize(370, 44); c.primaryAxisAlignItems = 'SPACE_BETWEEN'; c.counterAxisAlignItems = 'MAX';
    if (type === 'Map') {
      const pillL = figma.createAutoLayout('HORIZONTAL', { name: 'Location', itemSpacing: 8, counterAxisAlignItems: 'CENTER' }); pad(pillL, 0, 14, 0, 12); pillL.resize(100, 44); pillL.counterAxisSizingMode = 'FIXED'; radius(pillL, 'radius/pill'); glass(pillL, 'regular');
      const mark = PAGE('Foundations').findOne(n => n.name === 'Logo Mark').clone(); mark.resize(24, 24); pillL.appendChild(mark);
      pillL.appendChild(await text('Inland Empire', 'Web/Subheadline', 'text/primary', { weight: 'Semi Bold', name: 'Region' })); pillL.appendChild(icon('chevron-down', 'icon/muted', 18));
      c.appendChild(pillL);
      const right = figma.createAutoLayout('VERTICAL', { name: 'Actions', itemSpacing: 10 }); right.appendChild(mkBtn('locate')); right.appendChild(mkBtn('list')); c.appendChild(right);
    } else if (type === 'Detail') {
      c.appendChild(mkBtn('chevron-left')); c.appendChild(mkBtn('share'));
    } else {
      const titleCol = figma.createAutoLayout('VERTICAL', { name: 'Title', itemSpacing: 2 });
      titleCol.appendChild(await text('Saturday, Sep 6 · North Fontana', 'Web/Footnote', 'text/tertiary', { weight: 'Medium', name: 'Eyebrow' }));
      const lt = await text('This weekend', 'Web/Large Title', 'text/primary', { name: 'Title' }); titleCol.appendChild(lt);
      c.appendChild(titleCol); c.appendChild(mkBtn('sliders'));
      const kE = c.addComponentProperty('Eyebrow', 'TEXT', 'Saturday, Sep 6 · North Fontana'); titleCol.children[0].componentPropertyReferences = { characters: kE };
      const kT = c.addComponentProperty('Title', 'TEXT', 'This weekend'); lt.componentPropertyReferences = { characters: kT };
    }
    comps.push(c);
  }
  const set = figma.combineAsVariants(comps, page); set.name = 'Glass Toolbar';
  set.description = 'Top toolbar is glass with SF Symbol buttons only, no solid background. Large titles scroll into the glass. Map = region pill + locate/list. Detail = back + share over the hero photo. Feed = large title + filter.';
  layoutSet(set, 1); set.x = 0; set.y = nextY(page); out.toolbar = set.id;
}

// Bottom Search Bar — glass field above the tab bar, optional glass filter chips above it
if (!COMP('Bottom Search Bar')) {
  const c = figma.createComponent(); c.name = 'Bottom Search Bar';
  c.layoutMode = 'VERTICAL'; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; c.resize(370, 100); c.itemSpacing = 10;
  const chips = figma.createAutoLayout('HORIZONTAL', { name: 'Chips', itemSpacing: 8 }); c.appendChild(chips);
  for (const [ic, label] of [['calendar', 'This weekend'], ['locate', '25 mi'], ['car', 'All cars']]) {
    const ch = figma.createAutoLayout('HORIZONTAL', { name: 'Chip/' + label, itemSpacing: 6, counterAxisAlignItems: 'CENTER' }); pad(ch, 0, 10, 0, 10); ch.resize(60, 32); ch.counterAxisSizingMode = 'FIXED'; ch.primaryAxisSizingMode = 'AUTO'; radius(ch, 'radius/chip'); glass(ch, 'regular');
    ch.appendChild(icon(ic, 'icon/default', 18)); ch.appendChild(await text(label, 'Web/Caption 1', 'text/primary')); chips.appendChild(ch);
  }
  const field = figma.createAutoLayout('HORIZONTAL', { name: 'Field', itemSpacing: 10, counterAxisAlignItems: 'CENTER' }); pad(field, 0, 8, 0, 16); c.appendChild(field);
  field.layoutSizingHorizontal = 'FILL'; field.resize(370, 52); field.counterAxisSizingMode = 'FIXED'; field.setBoundVariable('height', V('Spacing', 'layout/searchBarHeight')); radius(field, 'radius/pill'); glass(field, 'regular');
  field.appendChild(icon('search', 'text/secondary', 24));
  const ph = await text('Search meets, hosts, places', 'Web/Body', 'text/secondary', { name: 'Placeholder' }); field.appendChild(ph); ph.layoutSizingHorizontal = 'FILL';
  const fb = figma.createAutoLayout('HORIZONTAL', { name: 'Filter', primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); fb.resize(36, 36); fb.primaryAxisSizingMode = 'FIXED'; fb.counterAxisSizingMode = 'FIXED'; radius(fb, 'radius/pill'); fill(fb, 'glass/highlight'); fb.appendChild(icon('sliders', 'icon/default', 18)); field.appendChild(fb);
  const kC = c.addComponentProperty('Show Chips', 'BOOLEAN', true); chips.componentPropertyReferences = { visible: kC };
  const kP = c.addComponentProperty('Placeholder', 'TEXT', 'Search meets, hosts, places'); ph.componentPropertyReferences = { characters: kP };
  c.description = 'Bottom search on the Map: thumbs live at the bottom. Tapping expands into a sheet with filters (glass morph). Map content inset = bottomSearchInset (156).';
  c.x = 0; c.y = nextY(page); out.searchBar = c.id;
}
return out;
