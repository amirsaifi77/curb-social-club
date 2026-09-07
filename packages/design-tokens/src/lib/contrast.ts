// WCAG 2.1 relative luminance and contrast ratio, matching the computation
// in brand-v2/work/palette.py and the tables in brand/brand-guide.md section 5.

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

// Hex8 values (#RRGGBBAA) are measured by their base color; alpha composites
// against unknowable backgrounds, so the gate checks the opaque component.
export function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '').slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`not a hex color: ${hex}`);
  }
  const r = channel(parseInt(h.slice(0, 2), 16));
  const g = channel(parseInt(h.slice(2, 4), 16));
  const b = channel(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
