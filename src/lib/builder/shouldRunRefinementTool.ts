const STRONG_CREATE =
  /\b(make me|build me|create me|generate me|give me a|show me a)\b/i;

const NEW_BUILDING_NOUNS =
  /\b(workshop|forge|cottage|cabin|house|porch house|building|structure)\b/i;

/** Strong create prompts replace the current build via the generate path. */
export function shouldStrongCreatePrompt(userText: string): boolean {
  const text = userText.trim();
  if (text.length === 0) return false;
  return STRONG_CREATE.test(text) && NEW_BUILDING_NOUNS.test(text);
}

const REFINE_VERBS =
  /\b(change|switch|move|wider|narrower|deeper|shallower|taller|shorter|steeper|flatter|more|fewer|add|extend|use|make it|make the|dark wood|slate|glass|wooden|stone)\b/i;

/**
 * Refinement when an active blueprint exists and the user is not starting a new building.
 */
export function shouldRunRefinementTool(
  userText: string,
  hasActiveBlueprint: boolean,
  hasImageAttachment: boolean,
): boolean {
  const text = userText.trim();
  if (!hasActiveBlueprint || text.length === 0) return false;
  if (hasImageAttachment && !REFINE_VERBS.test(text)) return false;
  if (shouldStrongCreatePrompt(text)) return false;
  return REFINE_VERBS.test(text);
}
