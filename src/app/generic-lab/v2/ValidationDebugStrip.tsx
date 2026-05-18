"use client";

import type { ComponentPlanV2Summary } from "@/src/app/generic-lab/v2/genericLabV2Utils";
import type { ValidationIssue } from "@/src/lib/blueprints/types/validationResult";
import { v2Panel } from "@/src/app/generic-lab/v2/genericLabV2Ui";

type Props = {
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
  readonly notes: readonly ValidationIssue[];
  readonly authoringJson: string;
  readonly normalizedJson: string | null;
  readonly planSummary: ComponentPlanV2Summary | null;
  readonly blockCount: number | null;
};

function IssueLines({ issues }: { readonly issues: readonly ValidationIssue[] }) {
  if (issues.length === 0) return <p className="text-[11px] text-zinc-600">None</p>;
  return (
    <ul className="max-h-28 space-y-1 overflow-y-auto text-[11px]">
      {issues.map((issue, i) => (
        <li
          key={`${issue.code}-${i}`}
          className={
            issue.severity === "error"
              ? "text-red-300/90"
              : issue.severity === "warning"
                ? "text-amber-200/90"
                : "text-zinc-500"
          }
        >
          <span className="text-zinc-600">[{issue.code}]</span> {issue.message}
          {issue.componentId ? (
            <span className="text-zinc-600"> · {issue.componentId}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function ValidationDebugStrip({
  errors,
  warnings,
  notes,
  authoringJson,
  normalizedJson,
  planSummary,
  blockCount,
}: Props) {
  const issueTotal = errors.length + warnings.length + notes.length;

  return (
    <div className={`${v2Panel()} shrink-0`}>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 marker:content-none [&::-webkit-details-marker]:hidden">
          <span>Validation & debug</span>
          <span className="font-mono text-[10px] font-normal normal-case text-zinc-600">
            {issueTotal === 0 ? "valid" : `${issueTotal} issue${issueTotal === 1 ? "" : "s"}`}
            {blockCount != null ? ` · ${blockCount.toLocaleString()} blocks` : ""}
          </span>
        </summary>
        <div className="grid gap-0 border-t border-zinc-700/60 lg:grid-cols-2">
          <div className="space-y-3 border-b border-zinc-700/50 p-4 lg:border-b-0 lg:border-r">
            <div>
              <h3 className="text-[10px] font-medium uppercase text-red-400/90">
                Errors ({errors.length})
              </h3>
              <IssueLines issues={errors} />
            </div>
            <div>
              <h3 className="text-[10px] font-medium uppercase text-amber-400/90">
                Warnings ({warnings.length})
              </h3>
              <IssueLines issues={warnings} />
            </div>
            <div>
              <h3 className="text-[10px] font-medium uppercase text-zinc-500">
                Notes ({notes.length})
              </h3>
              <IssueLines issues={notes} />
            </div>
          </div>
          <div className="space-y-3 p-4">
            <details>
              <summary className="cursor-pointer text-[10px] font-medium uppercase text-zinc-500">
                Authoring JSON
              </summary>
              <textarea
                readOnly
                rows={5}
                className="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-[9px] text-zinc-400"
                value={authoringJson}
              />
            </details>
            <details>
              <summary className="cursor-pointer text-[10px] font-medium uppercase text-zinc-500">
                Normalized JSON
              </summary>
              <textarea
                readOnly
                rows={4}
                className="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-[9px] text-zinc-400"
                value={normalizedJson ?? "(validation must pass)"}
              />
            </details>
            <details>
              <summary className="cursor-pointer text-[10px] font-medium uppercase text-zinc-500">
                ComponentPlan summary (read-only)
              </summary>
              <pre className="mt-2 max-h-32 overflow-auto rounded border border-zinc-700 bg-zinc-950 p-2 font-mono text-[9px] text-zinc-400">
                {planSummary
                  ? JSON.stringify(planSummary, null, 2)
                  : "(validation must pass)"}
              </pre>
            </details>
          </div>
        </div>
      </details>
    </div>
  );
}
