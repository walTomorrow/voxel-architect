"use client";

import type { ComponentPlanV2Summary } from "@/src/app/generic-lab/v2/genericLabV2Utils";

type Props = {
  readonly authoringJson: string;
  readonly normalizedJson: string | null;
  readonly planSummary: ComponentPlanV2Summary | null;
  readonly blockCount: number | null;
};

const TEXTAREA_CLASS =
  "mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-[10px] leading-snug text-zinc-300";

export function DebugPanel({
  authoringJson,
  normalizedJson,
  planSummary,
  blockCount,
}: Props) {
  return (
    <section className="space-y-3 border-t border-zinc-800/80 pt-4">
      <h2 className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        Debug (read-only)
      </h2>
      <p className="text-[10px] leading-snug text-zinc-600">
        ComponentPlanV2 is internal compiler IR — summary only, not editable.
      </p>

      <label className="block text-xs text-zinc-400">
        Authoring blueprint JSON
        <textarea
          readOnly
          rows={8}
          className={TEXTAREA_CLASS}
          value={authoringJson}
        />
      </label>

      <label className="block text-xs text-zinc-400">
        Normalized blueprint JSON
        <textarea
          readOnly
          rows={6}
          className={TEXTAREA_CLASS}
          value={normalizedJson ?? "(validation must pass)"}
        />
      </label>

      <div className="space-y-1">
        <span className="block text-xs text-zinc-400">ComponentPlanV2 summary</span>
        {!planSummary ? (
          <p className="font-mono text-[10px] text-zinc-600">
            (validation must pass)
          </p>
        ) : (
          <pre className="overflow-x-auto rounded border border-zinc-700 bg-zinc-900 p-2 font-mono text-[10px] leading-snug text-zinc-300">
            {JSON.stringify(planSummary, null, 2)}
          </pre>
        )}
      </div>

      {blockCount != null ? (
        <p className="font-mono text-xs text-zinc-400">
          Generated blocks:{" "}
          <span className="text-zinc-200">{blockCount.toLocaleString()}</span>
        </p>
      ) : null}
    </section>
  );
}
