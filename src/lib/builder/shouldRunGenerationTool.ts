const GENERATION_VERBS =
  /\b(make|build|create|generate|design|construct|recreate|show me|give me)\b/i;

/**
 * Server-controlled: run the deterministic builder tool only when the user text
 * clearly asks to generate/build. Image-only prompts stay chat-only.
 */
export function shouldRunGenerationTool(
  userText: string,
  hasImageAttachment: boolean,
): boolean {
  const text = userText.trim();
  if (text.length === 0) {
    return false;
  }

  if (hasImageAttachment && !GENERATION_VERBS.test(text)) {
    return false;
  }

  return GENERATION_VERBS.test(text);
}
