/** Deterministic per-title color/width, so a spine looks the same every
 * build without needing a manually-set color field or real cover art. */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export interface SpineStyle {
  background: string;
  color: string;
  width: number;
}

export function spineStyle(title: string): SpineStyle {
  const hash = hashString(title);
  const hue = hash % 360;
  const saturation = 30 + (hash % 25);
  const lightness = 28 + ((hash >> 4) % 30);
  const width = 42 + (hash % 6) * 7;
  return {
    background: `hsl(${hue} ${saturation}% ${lightness}%)`,
    color: lightness > 52 ? "#211d16" : "#f2ede1",
    width,
  };
}
