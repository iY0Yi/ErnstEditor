export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function isHexColor(value: string): boolean {
  return HEX_PATTERN.test(value);
}

export function parseHex(hex: string): RGBA | null {
  const match = HEX_PATTERN.exec(hex);
  if (!match) return null;
  let body = match[1];
  if (body.length <= 4) {
    body = body.split('').map(c => c + c).join('');
  }
  return {
    r: parseInt(body.slice(0, 2), 16),
    g: parseInt(body.slice(2, 4), 16),
    b: parseInt(body.slice(4, 6), 16),
    a: body.length === 8 ? parseInt(body.slice(6, 8), 16) / 255 : 1,
  };
}

const toHexByte = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');

export function toHex({ r, g, b, a }: RGBA): string {
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}${a < 1 ? toHexByte(a * 255) : ''}`;
}

export function withAlpha(hex: string, alpha: number): string {
  const c = parseHex(hex);
  return c ? toHex({ ...c, a: c.a * alpha }) : hex;
}

// アルファ付きの前景色を背景色に合成し、不透明色にする
export function blend(fg: string, bg: string): string {
  const f = parseHex(fg);
  const b = parseHex(bg);
  if (!f || !b) return fg;
  const mix = (x: number, y: number) => x * f.a + y * (1 - f.a);
  return toHex({ r: mix(f.r, b.r), g: mix(f.g, b.g), b: mix(f.b, b.b), a: 1 });
}

export function luminance(hex: string): number {
  const c = parseHex(hex);
  if (!c) return 0;
  return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
}
