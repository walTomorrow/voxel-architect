"use client";

import type { ComponentPlanV2Summary } from "@/src/app/generic-lab/v2/genericLabV2Utils";
import type { ValidationIssue } from "@/src/lib/blueprints/types/validationResult";
import { panel } from "@/src/app/generic-lab-concepts/conceptWorkbenchUi";

type Props = {
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
  readonly notes: readonly ValidationIssue[];
  readonly authoringJson: string;
  readonly normalizedJson: string | null;
  readonly planSummary: ComponentPlanV2Summary | null;
  readonly blockCount: number;
};

export function ConceptValidationConsole({
  errors,
  warnings,
  notes,
  authoringJson,
  normalizedJson,
  planSummary,
  blockCount,
}: Props) {
  const all = [...errors, ...warnings, ...notes];

  return (
    <div className={`${panel()} shrink-0 font-mono text-[10px]`}>
      <div className="flex items-center justify-between border-b border-zinc-700/60 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Output / validation console
        </span>
        <span className="text-zinc-600">
          {blockCount.toLocaleString()} blocks · {all.length} messages
        </span>
      </div>
      <div className="grid max-h-40 gap-0 overflow-hidden lg:grid-cols-3">
        <div className="border-b border-zinc-700/50 p-3 lg:border-b-0 lg:border-r">
          <div className="mb-1 text-[9px] uppercase text-red-400/80">Errors</div>
          <ConsoleLines issues={errors} />
          <div className="mt-2 mb-1 text-[9px] uppercase text-amber-400/80">Warnings</div>
          <ConsoleLines issues={warnings} />
          <div className="mt-2 mb-1 text-[9px] uppercase text-zinc-500">Notes</div>
          <ConsoleLines issues={notes} />
        </div>
        <div className="border-b border-zinc-700/50 p-3 lg:border-b-0 lg:border-r">
          <details>
            <summary className="cursor-pointer text-[9px] uppercase text-zinc-500">
              Normalized blueprint
            </summary>
            <pre className="mt-2 max-h-28 overflow-auto text-zinc-500">
              {normalizedJson ?? "(pass validation first)"}
            </pre>
          </details>
        </div>
        <div className="p-3">
          <details>
            <summary className="cursor-pointer text-[9px] uppercase text-zinc-500">
              ComponentPlanV2 summary (read-only IR)
            </summary>
            <pre className="mt-2 max-h-28 overflow-auto text-zinc-500">
              {planSummary ? JSON.stringify(planSummary, null, 2) : "(pass validation first)"}
            </pre>
          </details>
          <details className="mt-2">
            <summary className="cursor-pointer text-[9px] uppercase text-zinc-600">
              Authoring JSON
            </summary>
            <pre className="mt-1 max-h-20 overflow-auto text-zinc-600">{authoringJson}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}

function ConsoleLines({ issues }: { readonly issues: readonly ValidationIssue[] }) {
  if (issues.length === 0) {
    return <p className="text-zinc-600">—</p>;
  }
  return (
    <ul className="max-h-16 space-y-0.5 overflow-y-auto">
      {issues.map((i, idx) => (
        <li
          key={`${i.code}-${idx}`}
          className={
            i.severity === "error"
              ? "text-red-300/90"
              : i.severity === "warning"
                ? "text-amber-200/80"
                : "text-zinc-500"
          }
        >
          [{i.code}] {i.message}
        </li>
      ))}
    </ul>
  );
}
