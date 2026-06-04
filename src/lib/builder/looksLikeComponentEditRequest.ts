const BUILDING_PARTS =
  /\b(roof|wall|walls|window|windows|door|doors|porch|chimney|facade|floor|room|building|cabin|workshop|step|steps)\b/i;

const REMOVE_VERBS =
  /\b(remove|delete|take off|get rid of|strip|undo)\b/i;

const ADD_VERBS = /\b(add|install|put|attach)\b/i;

const COULD_YOU_EDIT =
  /\bcould you\b/i;

const TRY_AGAIN_REMOVE =
  /\b(try again|please).{0,40}\b(remove|delete)\b/i;

/**
 * Detects explicit component add/remove phrasing that must run the refine tool,
 * including polite forms ("could you remove the chimney?") that omit generic edit verbs.
 */
export function looksLikeComponentEditRequest(userText: string): boolean {
  const text = userText.trim();
  if (text.length === 0) return false;

  if (TRY_AGAIN_REMOVE.test(text) && BUILDING_PARTS.test(text)) {
    return true;
  }

  if (REMOVE_VERBS.test(text) && BUILDING_PARTS.test(text)) {
    return true;
  }

  if (ADD_VERBS.test(text) && BUILDING_PARTS.test(text)) {
    return true;
  }

  if (
    COULD_YOU_EDIT.test(text) &&
    /\b(remove|delete|add|widen|deepen)\b/i.test(text) &&
    BUILDING_PARTS.test(text)
  ) {
    return true;
  }

  if (/\bchanged my mind\b/i.test(text) && REMOVE_VERBS.test(text) && BUILDING_PARTS.test(text)) {
    return true;
  }

  return false;
}
