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

const GIVE_EDIT = /\bgive (it|the|this)\b/i;

const ROOF_KIND =
  /\b(gabled|gable|shed|pitched|peaked)\b/i;

const CASUAL_CHAT =
  /^(thanks|thank you|thx|hello|hi|hey|ok|okay|cool|nice|great|awesome|got it|sounds good|what do you think\??|how does (it|this) look\??|any thoughts\??)[\s!.?]*$/i;

const DESIGN_FEEDBACK =
  /\b(what do you think|how does (it|this) look|thoughts on|opinion on|feedback on|review (this|the|my)|of this design|about this design|this design|how is (it|this)|what do you (make|think) of|what would you suggest|do you like (this|the|my) design)\b/i;

const WANT_EDIT =
  /\bI want (?:it|the|this|the workshop|the building|the cabin)(?: to be| to feel| to look| to seem)?\b/i;

const CAN_YOU_MAKE =
  /\bcan you make (?:it|the|this|the workshop|the building|the cabin)\b/i;

const STRONG_EDIT_SIGNAL =
  /\b(make|change|switch|turn|convert|adjust|tweak|refine|update|give (it|the|this)|add more|add a|remove|wider|narrower|deeper|taller|shorter)\b/i;

const BUILDING_PARTS =
  /\b(roof|wall|walls|window|windows|door|doors|porch|chimney|facade|floor|room|building|cabin|workshop|step|steps|silhouette|materials?|design)\b/i;

const EDIT_STYLE =
  /\b(rustic|medieval|sturdy|sturdier|squat|squatter|welcoming|balanced|brighter|darker|warmer|colder|cozy|cozier|stone|wooden|wood|glass|slate|cobblestone|refined|heavy|heavier|solid|utilitarian|workshop-like|image-like)\b/i;

const EDIT_COMPARATIVE =
  /\b(more|less|fewer|taller|shorter|wider|narrower|deeper|higher|lower|bigger|smaller|larger|dominate|extend)\b/i;

const EDIT_IMPERATIVE =
  /\b(make|change|switch|turn|convert|adjust|tweak|refine|update|give)\b/i;

/** Opinion/review requests — chat with build context, not the refine tool. */
export function looksLikeDesignFeedback(userText: string): boolean {
  const text = userText.trim();
  if (text.length === 0) return false;
  if (!DESIGN_FEEDBACK.test(text)) return false;
  if (STRONG_EDIT_SIGNAL.test(text) && !DESIGN_FEEDBACK.test(text)) return false;
  if (GIVE_EDIT.test(text) && (BUILDING_PARTS.test(text) || ROOF_KIND.test(text))) {
    return false;
  }
  if (EDIT_IMPERATIVE.test(text) && (BUILDING_PARTS.test(text) || EDIT_STYLE.test(text))) {
    return false;
  }
  return true;
}

/**
 * Conservative heuristic: natural-language edit requests when a blueprint exists.
 */
export function looksLikeEditRequest(userText: string): boolean {
  const text = userText.trim();
  if (text.length === 0) return false;
  if (CASUAL_CHAT.test(text)) return false;
  if (looksLikeDesignFeedback(text)) return false;
  if (text.length < 8 && !BUILDING_PARTS.test(text) && !ROOF_KIND.test(text)) return false;

  if (WANT_EDIT.test(text) && EDIT_STYLE.test(text)) return true;
  if (/\bI want\b/.test(text) && EDIT_STYLE.test(text)) return true;
  if (CAN_YOU_MAKE.test(text) && (EDIT_STYLE.test(text) || BUILDING_PARTS.test(text))) {
    return true;
  }

  if (GIVE_EDIT.test(text) && (BUILDING_PARTS.test(text) || ROOF_KIND.test(text))) {
    return true;
  }
  if (ROOF_KIND.test(text) && BUILDING_PARTS.test(text)) {
    return true;
  }

  const hasPart = BUILDING_PARTS.test(text);
  const hasStyle = EDIT_STYLE.test(text);
  const hasCompare = EDIT_COMPARATIVE.test(text);
  const hasImperative = EDIT_IMPERATIVE.test(text);

  if (hasPart && (hasStyle || hasCompare || hasImperative)) return true;
  if (hasImperative && (hasStyle || hasCompare)) return true;
  if (REFINE_VERBS.test(text)) return true;
  return false;
}

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
  if (shouldStrongCreatePrompt(text)) return false;
  if (looksLikeDesignFeedback(text)) return false;

  const wantsEdit = REFINE_VERBS.test(text) || looksLikeEditRequest(text);
  if (!wantsEdit) return false;

  if (hasImageAttachment && !REFINE_VERBS.test(text) && !looksLikeEditRequest(text)) {
    return false;
  }

  return true;
}
