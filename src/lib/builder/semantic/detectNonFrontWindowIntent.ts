/**
 * True when the user mentions side/back/rear windows or excludes the front façade.
 * Used to avoid deterministic front-window matcher stealing the plan.
 */
export function mentionsNonFrontWindowSurfaces(prompt: string): boolean {
  const text = prompt.toLowerCase().trim();
  if (text.length === 0) return false;

  if (/\bnot (?:on )?(?:the )?front\b/.test(text)) return true;
  if (/\b(?:except|but not) (?:on )?(?:the )?front\b/.test(text)) return true;

  const mentionsSideOrBack = /\b(left|right|back|rear|side|sides)\b/.test(text);
  const mentionsFront = /\bfront\b/.test(text);
  if (/\bwindow/.test(text) && mentionsFront && !mentionsSideOrBack) {
    return false;
  }
  if (/\b(side|sides|lateral)\b/.test(text) && /\bwindow/.test(text)) return true;
  if (/\b(left|right)\b/.test(text) && /\bwindow/.test(text)) return true;
  if (/\b(back|rear)\b/.test(text) && /\bwindow/.test(text)) return true;
  if (/\b(left and right|right and left)\b/.test(text)) return true;
  if (/\bwindows? on the (?:left|right|back|rear|side)\b/.test(text)) return true;
  if (/\b(?:add|put|install).{0,30}windows?.{0,30}(?:left|right|back|rear|side)\b/.test(text)) {
    return true;
  }

  return false;
}
