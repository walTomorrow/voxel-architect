export function localApertureKey(lx: number, y: number, lz: number): string {
  return `${lx},${y},${lz}`;
}

export function parseLocalApertureKey(key: string): {
  lx: number;
  y: number;
  lz: number;
} {
  const [a, b, c] = key.split(",").map((s) => Number.parseInt(s, 10));
  return { lx: a, y: b, lz: c };
}
