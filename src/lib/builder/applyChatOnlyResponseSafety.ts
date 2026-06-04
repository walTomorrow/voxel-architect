import {
  guardNoToolChangeClaims,
  type GuardNoToolChangeClaimsInput,
} from "@/src/lib/builder/guardNoToolChangeClaims";
import { parseChatOnlyDiscussionResponse } from "@/src/lib/builder/parseChatOnlyDiscussionResponse";

export type ApplyChatOnlyResponseSafetyInput = GuardNoToolChangeClaimsInput;

export type ApplyChatOnlyResponseSafetyResult = {
  readonly text: string;
  readonly guarded: boolean;
  readonly parsedDiscussionJson: boolean;
  readonly guardReason?: string;
};

export function applyChatOnlyResponseSafety(
  input: ApplyChatOnlyResponseSafetyInput,
): ApplyChatOnlyResponseSafetyResult {
  if (input.hasToolResult) {
    return {
      text: input.assistantText.trim(),
      guarded: false,
      parsedDiscussionJson: false,
    };
  }

  const discussion = parseChatOnlyDiscussionResponse(input.assistantText);
  const guarded = guardNoToolChangeClaims({
    ...input,
    assistantText: discussion.message,
  });

  return {
    text: guarded.text,
    guarded: guarded.changed,
    parsedDiscussionJson: discussion.parsed,
    guardReason: guarded.reason,
  };
}
