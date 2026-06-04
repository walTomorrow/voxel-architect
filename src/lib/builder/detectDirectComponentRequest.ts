import type { AddableComponentKind } from "@/src/lib/builder/blueprintOperationsV2";

export type DirectComponentIntent =
  | { readonly kind: "add"; readonly componentType: AddableComponentKind }
  | { readonly kind: "remove"; readonly componentType?: AddableComponentKind }
  | { readonly kind: "widen_porch" }
  | { readonly kind: "update_windows" };

/** Broader semantic/style transforms may use multiple operations. */
export function isSemanticStyleTransformRequest(prompt: string): boolean {
  const text = prompt.toLowerCase().trim();
  if (text.length === 0) return false;
  return /\b(more welcoming|more medieval|more rustic|make it cozier|make it brighter|make it sturdier|more sturdy|utilitarian|workshop-like|aesthetic|character|feel more|look more)\b/i.test(
    text,
  );
}

export function detectDirectComponentRequest(prompt: string): DirectComponentIntent | null {
  const text = prompt.toLowerCase().trim();
  if (text.length === 0) return null;
  if (isSemanticStyleTransformRequest(text)) return null;

  if (
    /\b(remove|delete|take off|get rid of)\b/.test(text) &&
    /\bchimney\b/.test(text)
  ) {
    return { kind: "remove", componentType: "chimney" };
  }
  if (
    /\b(remove|delete|take off|get rid of)\b/.test(text) &&
    /\bporch\b/.test(text)
  ) {
    return { kind: "remove", componentType: "porch" };
  }
  if (/\b(remove (?:the )?side windows?|remove (?:the )?left windows?|remove (?:the )?right windows?|remove (?:the )?back windows?)\b/.test(text)) {
    return { kind: "remove", componentType: "window_group" };
  }

  if (/\b(wider porch|porch wider|make the porch wider|full.?width porch|full facade porch)\b/.test(text)) {
    return { kind: "widen_porch" };
  }

  if (/\b(add a chimney|add chimney|put a chimney|install a chimney)\b/.test(text)) {
    return { kind: "add", componentType: "chimney" };
  }
  if (/\b(add a porch|add porch|put a porch|install a porch)\b/.test(text)) {
    return { kind: "add", componentType: "porch" };
  }
  if (
    /\b(add windows?|add window|add a window|more windows on|windows on the (?:left|right|back|front))\b/.test(
      text,
    )
  ) {
    return { kind: "add", componentType: "window_group" };
  }

  if (/\bchimney\b/.test(text) && /\b(add|put|install)\b/.test(text)) {
    return { kind: "add", componentType: "chimney" };
  }
  if (/\bporch\b/.test(text) && /\b(add|put|install)\b/.test(text)) {
    return { kind: "add", componentType: "porch" };
  }

  return null;
}
