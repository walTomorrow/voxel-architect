export type GuardNoToolChangeClaimsInput = {
  readonly assistantText: string;
  readonly hasToolResult: boolean;
  readonly toolResultOk?: boolean;
  readonly hasActiveBlueprint?: boolean;
};

export type GuardNoToolChangeClaimsResult = {
  readonly text: string;
  readonly changed: boolean;
  readonly reason?: string;
};

const BUILD_SUBJECT =
  /\b(preview|build(?:ing)?|structure|workshop|cabin|house|roof|wall|walls|window|windows|door|doors|porch|chimney|facade|floor|room|palette|material|component|voxel)\b/i;

const SUGGESTION_SAFE =
  /\b(I (?:can|could|would|might) (?:suggest|recommend|try|help)|I(?:'d| would) suggest|you (?:could|can|might)|what I(?:'d| would) (?:suggest|recommend)|perhaps|maybe we could|a useful next (?:step|edit)|try (?:making|adding|increasing))\b/i;

const FORBIDDEN_CLAIM_PATTERNS: readonly RegExp[] = [
  /\bthe preview was updated\b/i,
  /\bpreview (?:has been|is now) updated\b/i,
  /\bI(?:'ve| have)? updated the (?:preview|build(?:ing)?)\b/i,
  /\bI(?:'ve| have)? changed the (?:preview|build(?:ing)?|design)\b/i,
  /\bI(?:'ve| have)? (?:updated|changed|modified|refined|rebuilt|regenerated|generated) (?:it|this|the build(?:ing)?|the preview|your build(?:ing)?)\b/i,
  /\bI (?:added|removed|installed|built|created) (?:a |an |the )?(?:chimney|porch|roof|window|door|floor|room|balcony|bedroom|wing|garage|tower|component)\b/i,
  /\bI (?:made|left) (?:it|the build(?:ing)?|the preview|this) (?:taller|shorter|wider|narrower|deeper|sturdier|brighter|darker|rustic|medieval|cozier|more )\b/i,
  /\bI made (?:it|the build(?:ing)?|the workshop|the cabin|the roof|the walls?) \b/i,
  /\bthe build(?:ing)? now (?:has|includes|features|looks|appears|is)\b/i,
  /\bthe preview now (?:shows|has|includes|reflects)\b/i,
  /\bit now has (?:a |an |more |extra )?\b/i,
  /\bI (?:increased|decreased|moved|switched|applied) (?:the )?(?:wall height|roof|windows?|porch|chimney|material|palette)\b/i,
  /\bI (?:increased|decreased) (?:the )?(?:height|width|depth|layers)\b/i,
];

function defaultFallback(hasActiveBlueprint: boolean): string {
  if (hasActiveBlueprint) {
    return "I can suggest that direction for the current build, but I did not update the preview on this turn because no builder tool ran. I can try to apply it through the builder tool next.";
  }
  return "I can discuss or suggest that change, but I did not update the preview on this turn because no builder tool ran. Ask me to apply the change and I'll run the builder tool.";
}

function isSuggestionDominant(text: string): boolean {
  if (!SUGGESTION_SAFE.test(text)) return false;
  return !FORBIDDEN_CLAIM_PATTERNS.some((p) => p.test(text));
}

function detectForbiddenClaim(text: string): string | null {
  if (isSuggestionDominant(text)) return null;

  for (const pattern of FORBIDDEN_CLAIM_PATTERNS) {
    if (!pattern.test(text)) continue;
    if (BUILD_SUBJECT.test(text) || /\b(it|this)\b/i.test(text)) {
      return pattern.source;
    }
  }

  if (/\bI added a chimney\b/i.test(text)) return "I added a chimney";
  if (/\bI made it sturdier\b/i.test(text)) return "I made it sturdier";

  return null;
}

export function guardNoToolChangeClaims(
  input: GuardNoToolChangeClaimsInput,
): GuardNoToolChangeClaimsResult {
  const trimmed = input.assistantText.trim();
  if (input.hasToolResult) {
    return { text: trimmed, changed: false };
  }
  if (trimmed.length === 0) {
    return { text: trimmed, changed: false };
  }

  const matched = detectForbiddenClaim(trimmed);
  if (!matched) {
    return { text: trimmed, changed: false };
  }

  return {
    text: defaultFallback(input.hasActiveBlueprint === true),
    changed: true,
    reason: matched,
  };
}
