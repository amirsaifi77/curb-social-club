// 02 — Button component set: Style=Primary|Secondary|Glass x Size=Large|Medium
// Primary = amber fill + espresso text (never white on amber). Secondary = surface + sand border. Glass = Liquid Glass regular.
const page = PAGE('Components'); await figma.setCurrentPageAsync(page);
if (COMP('Button')) return { skipped: 'Button exists' };
const comps = [];
for (const style of ['Primary', 'Secondary', 'Glass']) {
  for (const size of ['Large', 'Medium']) {
    const h = size === 'Large' ? 56 : 44;
    const c = figma.createComponent(); c.name = `Style=${style}, Size=${size}`;
    c.layoutMode = 'HORIZONTAL'; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; c.resize(200, h);
    c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'; c.itemSpacing = 8;
    pad(c, 0, size === 'Large' ? 22 : 18, 0, size === 'Large' ? 22 : 18);
    c.setBoundVariable('itemSpacing', V('Spacing', 'space/2'));
    radius(c, 'radius/pill');
    let textColor = 'text/primary';
    if (style === 'Primary') { fill(c, 'accent/fill'); textColor = 'accent/onAccent'; }
    else if (style === 'Secondary') { fill(c, 'bg/surface'); stroke(c, 'border/default', 1.5); }
    else { glass(c, 'regular'); }
    const ic = icon('check-circle', textColor, size === 'Large' ? 24 : 20); ic.name = 'Icon'; c.appendChild(ic);
    const label = await text("I'm going", size === 'Large' ? 'Web/Headline' : 'Web/Subheadline', textColor, { weight: size === 'Large' ? 'Bold' : 'Semi Bold', name: 'Label' });
    c.appendChild(label);
    const labelKey = c.addComponentProperty('Label', 'TEXT', "I'm going");
    const showIconKey = c.addComponentProperty('Show Icon', 'BOOLEAN', true);
    const iconKey = c.addComponentProperty('Icon', 'INSTANCE_SWAP', ICON('check-circle').id);
    label.componentPropertyReferences = { characters: labelKey };
    ic.componentPropertyReferences = { visible: showIconKey, mainComponent: iconKey };
    comps.push(c);
  }
}
const set = figma.combineAsVariants(comps, page);
set.name = 'Button'; set.description = 'One accent per screen. Primary is amber.500 with espresso text (6.31:1). Secondary is surface with a sand border. Glass is the Liquid Glass regular recipe for buttons that float over content. Sentence case labels.';
layoutSet(set, 2); set.x = 0; set.y = nextY(page);
return { setId: set.id, variantIds: set.children.map(c => c.id) };
