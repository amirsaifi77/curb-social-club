// 01 — Photo Placeholder component set (Tone=Dawn|Sky|Dusk|Mist), 360x270 (4:3)
const page = PAGE('Components'); await figma.setCurrentPageAsync(page);
if (COMP('Photo Placeholder')) return { skipped: 'Photo Placeholder exists' };
const tones = { Dawn: ['#F5B865','#E8A052','#8A7E74','#4A403B'], Sky: ['#BFDDF5','#F5D9A6','#8A7E74','#3A312C'], Dusk: ['#F0A040','#C26A25','#5A3A22','#2A1A10'], Mist: ['#E6F2FB','#FAD9A6','#B3A79D','#4A403B'] };
const carSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 70" width="200" height="70"><g fill="#1F1712"><path d="M8 52c0-6 4-10 10-11l22-3 22-18c3-3 7-4 11-4h44c5 0 9 2 12 5l18 17 32 6c6 1 11 6 11 12v6c0 3-2 5-5 5H13c-3 0-5-2-5-5z"/><circle cx="52" cy="58" r="11" fill="#FBF7F1"/><circle cx="52" cy="58" r="5"/><circle cx="150" cy="58" r="11" fill="#FBF7F1"/><circle cx="150" cy="58" r="5"/><path d="M66 36l16-14h30l4 14z" fill="#FBF7F1" opacity="0.55"/><path d="M120 22h22l14 14h-34z" fill="#FBF7F1" opacity="0.55"/></g></svg>`;
const comps = [];
for (const [tone, stops] of Object.entries(tones)) {
  const c = figma.createComponent(); c.name = `Tone=${tone}`; c.resize(360, 270); c.clipsContent = true;
  c.fills = [{ type: 'GRADIENT_LINEAR', gradientTransform: [[0,1,0],[-1,0,1]], gradientStops: [{ position: 0, color: hxa(stops[0]) }, { position: 0.38, color: hxa(stops[1]) }, { position: 0.62, color: hxa(stops[2]) }, { position: 1, color: hxa(stops[3]) }] }];
  const glow = figma.createEllipse(); glow.name = 'highlight'; glow.resize(300, 200); glow.x = -70; glow.y = -110;
  glow.fills = [{ type: 'GRADIENT_RADIAL', gradientTransform: [[1,0,0],[0,1,0]], gradientStops: [{ position: 0, color: { r: 1, g: 243/255, b: 223/255, a: 0.9 } }, { position: 1, color: { r: 1, g: 243/255, b: 223/255, a: 0 } }] }];
  c.appendChild(glow);
  const car = figma.createNodeFromSvg(carSvg); car.name = 'car'; c.appendChild(car); car.resize(209, 73); car.x = (360 - 209) / 2; car.y = 270 - 73 - 27; car.opacity = 0.78;
  car.constraints = { horizontal: 'CENTER', vertical: 'MAX' };
  comps.push(c);
}
const set = figma.combineAsVariants(comps, page);
set.name = 'Photo Placeholder'; set.description = 'Stand-in for a 4:3 meet photo. Four warm gradient tones with a car silhouette. Swap for a real image fill in production.';
layoutSet(set, 4); set.x = 0; set.y = nextY(page);
return { setId: set.id, variantIds: set.children.map(c => c.id) };
