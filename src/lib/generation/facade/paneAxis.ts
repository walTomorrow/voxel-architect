/**
 * Pane thickness axis for a façade window cell (generator-authored hint).
 * Not connection-aware — future neighbor-derived panes belong in backlog work.
 *
 * - Front/back façades (constant `lz`): thin extent along world Z → `axis: "x"`.
 * - Left/right façades (constant `lx`): thin extent along world X → `axis: "z"`.
 */
export function paneAxisForWindowCell(
  lx: number,
  lz: number,
  W: number,
  D: number,
): "x" | "z" | undefined {
  const onFrontBack = lz === 0 || lz === D - 1;
  const onLeftRight = lx === 0 || lx === W - 1;
  if (onFrontBack && !onLeftRight) return "x";
  if (onLeftRight && !onFrontBack) return "z";
  return undefined;
}
