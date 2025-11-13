function hexToRgb(hex: string) {
  let value = hex.trim();
  if (!value.startsWith('#')) {
    throw new Error(`Expected hex color, received: ${hex}`);
  }
  value = value.slice(1);
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (value.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const num = parseInt(value, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function channelToLinear(component: number) {
  const srgb = component / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const rLin = channelToLinear(r);
  const gLin = channelToLinear(g);
  const bLin = channelToLinear(b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

export function contrastRatio(hex1: string, hex2: string) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

export { hexToRgb };
