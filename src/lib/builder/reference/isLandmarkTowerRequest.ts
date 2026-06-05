const LANDMARK_TOWER_PATTERNS = [
  /\blandmark\s+tower\b/i,
  /\bcampus\s+tower\b/i,
  /\bbell\s+tower\b/i,
  /\bclock\s+tower\b/i,
  /\btall\s+stone\s+tower\b/i,
  /\bsandstone\s+tower\b/i,
  /\bhoover\s+tower\b/i,
  /\bstanford\s+hoover\b/i,
  /\bstanford\s+tower\b/i,
  /\bbuild\s+something\s+like\s+this(?:\s+tower)?\b/i,
  /\b(?:tower|building)\s+from\s+(?:these\s+)?(?:photos?|images?|references?)\b/i,
  /\blike\s+this\s+tower\b/i,
  /\b(?:recreate|replicate|reproduce)\s+(?:a\s+)?tower\b/i,
  /\btower\s+inspired\s+by\b/i,
  /\b(?:this|the)\s+tower\b/i,
  /\b(?:round|octagonal|circular)\s+tower\b/i,
];

export function isLandmarkTowerRequest(text: string): boolean {
  const t = text.trim();
  if (t.length === 0) return false;
  return LANDMARK_TOWER_PATTERNS.some((re) => re.test(t));
}
