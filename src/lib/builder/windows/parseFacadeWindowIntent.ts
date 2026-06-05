import type { RoomFace } from "@/src/lib/blueprints/types/genericBuildingV2";

import { parseWindowTreatmentFromPrompt } from "@/src/lib/blueprints/windowTreatment";

import { isSemanticStyleTransformRequest } from "@/src/lib/builder/detectDirectComponentRequest";

import type { FacadeWindowIntent } from "@/src/lib/builder/windows/facadeWindowIntentTypes";

import {

  affordanceForFace,

  facesWithWindowEditCapacity,

  type WindowFacadeAffordances,

} from "@/src/lib/builder/windows/windowFacadeAffordances";



const ALL_FACES: readonly RoomFace[] = ["front", "back", "left", "right"];

/** Matches mixed remove-then-add clauses, including "and then add". */
const MIXED_ADD_CLAUSE = /\b(?:but|and)(?:\s+then)?\s+(?:add|put|place)\b/;



function hasWindowIntentSignals(text: string): boolean {

  return (

    /\b(window|windows|façade|facade)\b/.test(text) || /\bno\s+windows?\b/.test(text)

  );

}



function parseExcludedFaces(text: string): RoomFace[] {

  const excluded: RoomFace[] = [];

  if (/\bnot (?:to |on )?(?:the )?front\b/.test(text)) excluded.push("front");

  if (/\b(?:except|but not) (?:to |on )?(?:the )?front\b/.test(text)) excluded.push("front");

  if (/\bnot (?:to |on )?(?:the )?(?:left|right|back|rear|side|sides)\b/.test(text)) {

    if (/\bleft\b/.test(text)) excluded.push("left");

    if (/\bright\b/.test(text)) excluded.push("right");

    if (/\b(back|rear)\b/.test(text)) excluded.push("back");

  }

  return [...new Set(excluded)];

}



function parseRemoveAllWindows(text: string): boolean {

  if (/\b(remove|delete|get rid of)\s+(?:all\s+(?:of\s+)?(?:the\s+)?)?windows?\b/.test(text)) {

    return true;

  }

  if (/\bno\s+windows?\b/.test(text) && /\b(remove|delete|make|want|have)\b/.test(text)) {

    return true;

  }

  if (/\bwalls?\s+with\s+no\s+windows?\b/.test(text)) return true;

  if (/\b(?:house|building|workshop).{0,40}no\s+windows?\b/.test(text)) return true;

  if (/\bmake\s+(?:the\s+)?(?:house|building|workshop|walls?).{0,30}(?:have\s+)?no\s+windows?\b/.test(text)) {

    return true;

  }

  if (/\bi\s+want\s+(?:the\s+)?walls?\s+to\s+have\s+no\s+windows?\b/.test(text)) return true;

  return false;

}



function facesFromSegment(text: string, options?: { sidesAsLeftRight?: boolean }): RoomFace[] {

  const faces: RoomFace[] = [];

  if (options?.sidesAsLeftRight && /\b(?:side|sides)\b/.test(text)) {

    faces.push("left", "right");

  }

  if (
    /\b(left and right|right and left|both (?:the )?(?:left and right|sides))\b/.test(text) ||
    /\b(?:left\s+and\s+right|right\s+and\s+left)(?:\s+side)?\b/.test(text)
  ) {
    faces.push("left", "right");
  }

  if (/\bfront\b/.test(text)) faces.push("front");

  if (/\bleft\b/.test(text)) faces.push("left");

  if (/\bright\b/.test(text)) faces.push("right");

  if (/\b(back|rear)\b/.test(text)) faces.push("back");

  return [...new Set(faces)];

}



function parseRemoveFaces(text: string): RoomFace[] {

  if (parseRemoveAllWindows(text)) return [];



  const faces: RoomFace[] = [];



  if (/\b(remove|delete|take off|get rid of)\b/.test(text) && /\b(side windows?|side window groups?)\b/.test(text)) {

    faces.push("left", "right");

  }



  if (/\bmake\s+there\s+be\s+no\s+front\s+windows?\b/.test(text)) {

    faces.push("front");

  }

  if (/\bno\s+front\s+windows?\b/.test(text) || /\bno\s+windows?\s+on\s+(?:the\s+)?front\b/.test(text)) {

    faces.push("front");

  }



  const takeOff = text.match(

    /\btake\s+(?:the\s+)?windows?\s+off\s+(?:the\s+)?(front|back|left|right|sides?)\b/,

  );

  if (takeOff) {

    if (takeOff[1] === "sides" || takeOff[1] === "side") faces.push("left", "right");

    else faces.push(takeOff[1] as RoomFace);

  }



  const removeSegments = text.split(MIXED_ADD_CLAUSE);

  const removeText = removeSegments[0] ?? text;

  if (/\b(remove|delete|take off|get rid of)\b/.test(removeText) && /\bwindow/.test(removeText)) {

    for (const face of facesFromSegment(removeText, { sidesAsLeftRight: true })) {

      faces.push(face);

    }

  }



  if (/\bmove\s+(?:the\s+)?(?:side\s+)?windows?\s+(?:from|to)\b/.test(text)) {

    const from = text.match(/\bfrom\s+(?:the\s+)?(front|back|left|right|sides?)\b/);

    if (from) {

      if (from[1] === "sides" || from[1] === "side") faces.push("left", "right");

      else faces.push(from[1] as RoomFace);

    }

    if (/\bmove\s+(?:the\s+)?side\s+windows?\s+to\b/.test(text)) {

      faces.push("left", "right");

    }

  }



  return [...new Set(faces)];

}



function parseMoveIntent(text: string): { sourceFaces: RoomFace[]; destFaces: RoomFace[] } | null {

  if (/\bmove\s+(?:the\s+)?side\s+windows?\s+to\s+(?:the\s+)?back\b/.test(text)) {

    return { sourceFaces: ["left", "right"], destFaces: ["back"] };

  }



  if (!/\bmove\s+(?:the\s+)?windows?\s+from\b/.test(text) && !/\btake\s+(?:the\s+)?windows?\s+off\b/.test(text)) {

    return null;

  }



  const sourceFaces: RoomFace[] = [];

  const destFaces: RoomFace[] = [];



  const from = text.match(/\bfrom\s+(?:the\s+)?(front|back|left|right|sides?)\b/);

  if (from) {

    if (from[1] === "sides" || from[1] === "side") sourceFaces.push("left", "right");

    else sourceFaces.push(from[1] as RoomFace);

  }



  const takeOff = text.match(/\btake\s+(?:the\s+)?windows?\s+off\s+(?:the\s+)?(front|back|left|right|sides?)\b/);

  if (takeOff) {

    if (takeOff[1] === "sides" || takeOff[1] === "side") sourceFaces.push("left", "right");

    else sourceFaces.push(takeOff[1] as RoomFace);

  }



  if (/\bto\s+(?:the\s+)?sides?\b/.test(text)) destFaces.push("left", "right");

  if (/\bto\s+(?:the\s+)?back\b/.test(text)) destFaces.push("back");

  if (/\bto\s+(?:the\s+)?left\b/.test(text)) destFaces.push("left");

  if (/\bto\s+(?:the\s+)?right\b/.test(text)) destFaces.push("right");

  if (/\bto\s+(?:the\s+)?front\b/.test(text)) destFaces.push("front");



  const putOn = text.match(/\bput\s+(?:them\s+)?on\s+(?:the\s+)?(front|back|left|right|sides?)\b/);

  if (putOn) {

    if (putOn[1] === "sides" || putOn[1] === "side") destFaces.push("left", "right");

    else destFaces.push(putOn[1] as RoomFace);

  }



  if (sourceFaces.length === 0 && destFaces.length === 0) return null;

  if (sourceFaces.length === 0 || destFaces.length === 0) return null;



  return {

    sourceFaces: [...new Set(sourceFaces)],

    destFaces: [...new Set(destFaces)],

  };

}



function parseAddOrUpdateFaces(text: string): RoomFace[] {

  const faces: RoomFace[] = [];

  const hasMixedAdd =
    MIXED_ADD_CLAUSE.test(text) ||
    /\b(add|put|place|more)\s+(?:\w+\s+){0,6}windows?\b/.test(text);

  if (/\b(remove|delete|take off|get rid of)\b/.test(text) && !hasMixedAdd) {

    return [];

  }

  const addSegments = text.split(MIXED_ADD_CLAUSE);

  const addText = addSegments.length > 1 ? addSegments[addSegments.length - 1]! : text;



  const segments = addSegments.length > 1 ? [addText] : [text];



  for (const seg of segments) {
    const isPostMixedClause = addSegments.length > 1 && seg === addText;
    if (
      !isPostMixedClause &&
      !/\b(add|put|place|more|windows?)\b/.test(seg)
    ) {
      continue;
    }

    for (const face of facesFromSegment(seg, { sidesAsLeftRight: /\bside/.test(seg) })) {
      faces.push(face);
    }
  }



  if (/\bput\s+windows?\s+on\s+(?:the\s+)?(back|left|right|front)\b/.test(text)) {

    const m = text.match(/\bput\s+windows?\s+on\s+(?:the\s+)?(back|left|right|front)\b/);

    if (m) faces.push(m[1] as RoomFace);

  }



  return [...new Set(faces)];

}



function parseCountMode(text: string): {

  countMode: FacadeWindowIntent["countMode"];

  requestedCount?: number;

  plurality: FacadeWindowIntent["plurality"];

  perFaceRequestedCounts?: Partial<Record<RoomFace, number>>;

} {

  const perFaceRequestedCounts: Partial<Record<RoomFace, number>> = {};



  if (
    /\bone\s+(?:window\s+)?(?:to\s+)?(?:the\s+)?(?:left\s+and\s+right|right\s+and\s+left)\s+side/.test(
      text,
    ) ||
    /\bone\s+window\s+on\s+each\s+side\b/.test(text) ||
    /\bone\s+on\s+each\s+side\b/.test(text)
  ) {

    perFaceRequestedCounts.left = 1;

    perFaceRequestedCounts.right = 1;

    return {

      countMode: "total",

      requestedCount: 1,

      plurality: "single",

      perFaceRequestedCounts,

    };

  }



  const onlyOne =

    (/\b(only|just|exactly)\b/.test(text) &&

      (/\bone window\b/.test(text) || /\b1 window\b/.test(text) || /\bhave one\b/.test(text))) ||

    (/\bfront\b/.test(text) &&

      /\b(only|just)\b/.test(text) &&

      /\bone\b/.test(text) &&

      /\bwindow/.test(text));

  const setTotal =

    /\b(?:set|make)\s+(?:the\s+)?(?:[\w]+\s+)*windows?\s+to\s+(\d+)\b/.test(text) ||

    /\b(set|make).{0,40}(?:to |have )?(\d+)\b/.test(text) ||

    /\b(\d+)\s+windows?\s+(?:total|only|to)\b/.test(text);



  let requestedCount: number | undefined;

  const numMatch =

    text.match(/\b(?:set|make)\s+(?:the\s+)?(?:[\w]+\s+)*windows?\s+to\s+(\d+)\b/) ??

    text.match(/\b(?:to |have |only )?(\d+)\s+windows?\b/) ??

    text.match(/\bwindows?\s+(?:to |at )?(\d+)\b/) ??

    text.match(/\b(two|three|four|five)\s+windows?\b/);

  if (numMatch) {

    const raw = numMatch[1]!;

    const wordMap: Record<string, number> = { two: 2, three: 3, four: 4, five: 5 };

    requestedCount = wordMap[raw] ?? Number.parseInt(raw, 10);

  }



  if (onlyOne || (/\bfront\b/.test(text) && requestedCount === 1)) {

    return { countMode: "total", requestedCount: 1, plurality: "single" };

  }

  if (setTotal && requestedCount != null) {

    return {

      countMode: "total",

      requestedCount,

      plurality: requestedCount === 1 ? "single" : "plural",

    };

  }

  if (/\ba window\b/.test(text) && !/\bwindows\b/.test(text)) {

    return { countMode: "delta", requestedCount: 1, plurality: "single" };

  }

  if (/\b(more windows|extra windows|another window|add a window)\b/.test(text)) {

    return { countMode: "delta", plurality: "single" };

  }

  if (/\b(add windows|windows on)\b/.test(text)) {

    return {

      countMode: "unspecified",

      plurality: "plural",

      ...(requestedCount != null ? { requestedCount } : {}),

    };

  }

  if (requestedCount != null) {

    return {

      countMode: "total",

      requestedCount,

      plurality: requestedCount === 1 ? "single" : "plural",

    };

  }

  return { countMode: "unspecified", plurality: "unspecified" };

}



function resolveAddOrUpdateFaces(

  addOrUpdateFaces: readonly RoomFace[],

  excludedFaces: readonly RoomFace[],

  affordances: WindowFacadeAffordances,

  countMode: FacadeWindowIntent["countMode"],

): readonly RoomFace[] {

  const excluded = new Set(excludedFaces);

  let targets = addOrUpdateFaces.filter((f) => !excluded.has(f));



  if (targets.length === 0 && (countMode === "delta" || countMode === "unspecified")) {

    const capacity = facesWithWindowEditCapacity(affordances, { excludeFaces: excludedFaces });

    if (excluded.has("front") && capacity.length > 0) {

      return capacity;

    }

  }



  if (targets.length === 0 && addOrUpdateFaces.length === 0 && !excluded.has("front")) {

    const front = affordanceForFace(affordances, "front");

    if (front && (front.canAddGroup || front.canIncrease) && countMode === "delta") {

      return ["front"];

    }

  }



  return targets;

}



function computeConfidence(

  text: string,

  removeAllWindows: boolean,

  removeFaces: readonly RoomFace[],

  addOrUpdateFaces: readonly RoomFace[],

  excludedFaces: readonly RoomFace[],

  hasAddClause: boolean,

  hasRemoveClause: boolean,

): FacadeWindowIntent["confidence"] {

  if (removeAllWindows) return "high";

  if (hasRemoveClause && hasAddClause && (removeFaces.length > 0 || addOrUpdateFaces.length > 0)) {

    return "high";

  }

  if (removeFaces.length > 0 && hasRemoveClause && !hasAddClause) return "high";

  if (addOrUpdateFaces.length > 0 && excludedFaces.length > 0) return "high";

  if (addOrUpdateFaces.length > 0) return "high";

  if (/\b(window|windows)\b/.test(text) && (removeFaces.length > 0 || addOrUpdateFaces.length > 0)) {

    return "medium";

  }

  return "low";

}



export function parseFacadeWindowIntent(

  prompt: string,

  affordances: WindowFacadeAffordances,

): FacadeWindowIntent | null {

  const text = prompt.toLowerCase().trim();

  if (text.length === 0) return null;

  if (isSemanticStyleTransformRequest(prompt)) return null;

  if (!hasWindowIntentSignals(text)) return null;



  const rawMatches: string[] = [];

  const removeAllWindows = parseRemoveAllWindows(text);

  if (removeAllWindows) rawMatches.push("removeAll");



  const excludedFaces = parseExcludedFaces(text);

  if (excludedFaces.length > 0) rawMatches.push(`excluded:${excludedFaces.join(",")}`);



  let removeFaces = parseRemoveFaces(text);

  let addOrUpdateFaces = parseAddOrUpdateFaces(text);

  let sourceFaces: RoomFace[] = [];



  const move = parseMoveIntent(text);

  if (move) {

    sourceFaces = move.sourceFaces;

    removeFaces = [...new Set([...removeFaces, ...move.sourceFaces])];

    addOrUpdateFaces = [...new Set([...addOrUpdateFaces, ...move.destFaces])];

    rawMatches.push(`move:${move.sourceFaces.join(",")}->${move.destFaces.join(",")}`);

  }



  const hasRemoveClause =

    removeAllWindows ||

    removeFaces.length > 0 ||

    (/\b(remove|delete|take off|get rid of)\b/.test(text) && /\bwindow/.test(text));

  const hasAddClause =

    addOrUpdateFaces.length > 0 ||

    (/\b(add|put|place|more)\b/.test(text) && /\bwindows?\b/.test(text));



  const { countMode, requestedCount, plurality, perFaceRequestedCounts } = parseCountMode(text);

  const windowTreatment = parseWindowTreatmentFromPrompt(prompt);



  const resolvedAddFaces = resolveAddOrUpdateFaces(

    addOrUpdateFaces,

    excludedFaces,

    affordances,

    countMode,

  );



  const requestedFaces = [

    ...new Set([...removeFaces, ...addOrUpdateFaces, ...sourceFaces]),

  ];



  const targetFaces = resolvedAddFaces;

  if (removeFaces.length > 0) rawMatches.push(`remove:${removeFaces.join(",")}`);

  if (resolvedAddFaces.length > 0) rawMatches.push(`addOrUpdate:${resolvedAddFaces.join(",")}`);



  const confidence = computeConfidence(

    text,

    removeAllWindows,

    removeFaces,

    resolvedAddFaces,

    excludedFaces,

    hasAddClause,

    hasRemoveClause,

  );



  if (!hasRemoveClause && !hasAddClause && confidence === "low") {

    return null;

  }



  if (hasRemoveClause && !removeAllWindows && removeFaces.length === 0 && !hasAddClause) {

    return null;

  }



  if (!hasRemoveClause && resolvedAddFaces.length === 0 && confidence === "low") {

    return null;

  }



  return {

    kind: "window_intent",

    requestedFaces,

    excludedFaces,

    targetFaces,

    removeFaces,

    addOrUpdateFaces: resolvedAddFaces,

    sourceFaces,

    removeAllWindows,

    countMode,

    requestedCount,

    perFaceRequestedCounts,

    plurality,

    operationScope: "window_only",

    confidence,

    windowTreatment,

    rawMatches,

  };

}



export function intentTargetsFace(intent: FacadeWindowIntent, face: RoomFace): boolean {

  return (

    intent.addOrUpdateFaces.includes(face) ||

    intent.removeFaces.includes(face) ||

    intent.targetFaces.includes(face)

  );

}



export function intentExcludesFace(intent: FacadeWindowIntent, face: RoomFace): boolean {

  return intent.excludedFaces.includes(face);

}



export function allRoomFaces(): readonly RoomFace[] {

  return ALL_FACES;

}


