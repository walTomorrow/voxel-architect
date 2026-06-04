export type RefinementPromptClass = "literal" | "semantic" | "structural";

function lower(text: string): string {
  return text.toLowerCase();
}

const SEMANTIC_STYLE =
  /\b(squat|stocky|sturdy|sturdier|rustic|medieval|brighter|darker|warmer|colder|cozy|welcoming|utilitarian|refined|heavy|heavier|solid|facade|silhouette|dominate|dominant|prominent|balanced|workshop-like|image-like|aesthetic|character)\b/;

const SEMANTIC_COMPARATIVE_STYLE =
  /\b(more|less)\s+(squat|stocky|sturdy|rustic|medieval|bright|dark|warm|cozy|welcoming|solid|heavy|refined)\b/;

const SEMANTIC_LIKE =
  /\b(look(s)? like|feel(s)? like|more like|similar to|kind of like)\b/;

function hasSemanticSignals(text: string): boolean {
  if (SEMANTIC_STYLE.test(text)) return true;
  if (SEMANTIC_COMPARATIVE_STYLE.test(text)) return true;
  if (SEMANTIC_LIKE.test(text)) return true;
  if (/\bmore rustic\b/.test(text)) return true;
  if (/\bless squat\b/.test(text)) return true;
  if (/\bmore medieval\b/.test(text)) return true;
  return false;
}

function hasLiteralPorchDepthSignals(text: string): boolean {
  if (!/\bporch\b/.test(text)) return false;
  if (/\bextend the porch\b/.test(text) || /\bextend porch\b/.test(text)) return true;
  if (/\b(deeper|more deep|shallower|less deep)\b/.test(text)) return true;
  return false;
}

function hasExplicitMaterialCommand(text: string): boolean {
  if (/\bmake the roof oak\b/.test(text) || /\boak roof\b/.test(text)) return true;
  if (/\b(dark wood roof|roof dark wood|wooden roof|wood roof|dark roof)\b/.test(text)) return true;
  if (/\b(slate roof)\b/.test(text)) return true;
  if (/\b(stone walls?|walls? stone|cobblestone walls?|brick walls?|limestone brick)\b/.test(text)) {
    return true;
  }
  if (/\b(glass windows?|windows? glass)\b/.test(text)) return true;
  if (
    /\b(make the|make)\s+(roof|wall|walls|floor|door|window|windows)\s+(oak|cobblestone|stone|slate|glass|brick|limestone|wood)\b/.test(
      text,
    )
  ) {
    return true;
  }
  return false;
}

function hasLiteralMechanicalSignals(text: string): boolean {
  if (hasLiteralPorchDepthSignals(text)) return true;

  if (/\b(taller|shorter|higher|lower|make it tall|make it short)\b/.test(text)) return true;
  if (/\b(wider|narrower|more wide|less wide|more narrow)\b/.test(text) && !/\bporch\b/.test(text)) {
    return true;
  }
  if (/\b(deeper|shallower|more deep|less deep)\b/.test(text) && !/\bporch\b/.test(text)) {
    return true;
  }
  if (/\b(larger|bigger|smaller)\b/.test(text)) return true;

  if (/\b(more windows|add windows|extra windows|fewer windows|less windows|remove a window)\b/.test(text)) {
    return true;
  }

  if (/\b(shed roof|gable roof|gabled roof|pitched roof|peaked roof|give it a gable|give it a gabled)\b/.test(text)) {
    return true;
  }
  if (/\b(steeper|flatter|more layers|fewer layers|taller roof|shorter roof)\b/.test(text)) {
    return true;
  }

  if (/\b(chimney.*(left|right|back)|move chimney.*(left|right|back))\b/.test(text)) {
    return true;
  }

  if (hasExplicitMaterialCommand(text)) return true;

  return false;
}

function hasStructuralUnsupportedSignals(text: string): boolean {
  if (/\bsecond floor\b/.test(text)) return true;
  if (/\bside room\b/.test(text)) return true;
  if (/\binterior bedroom\b/.test(text)) return true;
  if (/\b(balcony|bedroom wing|add a wing)\b/.test(text)) return true;

  if (/\b(add|remove|delete)\b/.test(text) && /\b(porch|chimney|floor|room|bedroom|tower|garage|balcony)\b/.test(text)) {
    return true;
  }
  if (/\badd a porch\b/.test(text) || /\bremove the porch\b/.test(text) || /\bremove porch\b/.test(text)) {
    return true;
  }

  if (/\b(wider|narrower)\b/.test(text) && /\bporch\b/.test(text)) return true;
  if (/\b(wider porch|porch wider|narrower porch|porch narrower)\b/.test(text)) return true;

  return false;
}

/**
 * Classifies refinement prompts for auto-mode planner routing.
 * Precedence: semantic → literal mechanical → structural unsupported → default literal.
 */
export function classifyRefinementPrompt(prompt: string): RefinementPromptClass {
  const text = lower(prompt.trim());
  if (text.length === 0) return "literal";

  if (hasSemanticSignals(text)) return "semantic";
  if (hasLiteralMechanicalSignals(text)) return "literal";
  if (hasStructuralUnsupportedSignals(text)) return "structural";

  return "literal";
}
