"use client";

import type { ValidationIssue } from "@/src/lib/blueprints/types/validationResult";

type Props = {
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
  readonly notes: readonly ValidationIssue[];
};

function IssueList({
  title,
  issues,
  tone,
}: {
  readonly title: string;
  readonly issues: readonly ValidationIssue[];
  readonly tone: "error" | "warning" | "note";
}) {
  if (issues.length === 0) return null;

  const border =
    tone === "error"
      ? "border-red-500/30"
      : tone === "warning"
        ? "border-amber-500/30"
        : "border-zinc-600/40";
  const bg =
    tone === "error"
      ? "bg-red-950/25"
      : tone === "warning"
        ? "bg-amber-950/20"
        : "bg-zinc-900/50";
  const titleColor =
    tone === "error"
      ? "text-red-300/95"
      : tone === "warning"
        ? "text-amber-200/90"
        : "text-zinc-400";

  return (
    <div className={`rounded-md border ${border} ${bg} p-2`}>
      <h3 className={`text-[10px] font-medium uppercase tracking-wider ${titleColor}`}>
        {title} ({issues.length})
      </h3>
      <ul className="mt-2 space-y-2">
        {issues.map((issue, i) => (
          <li
            key={`${issue.code}-${issue.path ?? ""}-${i}`}
            className="font-mono text-[10px] leading-snug text-zinc-300"
          >
            <span className="text-zinc-500">[{issue.code}]</span> {issue.message}
            <IssueMeta issue={issue} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function IssueMeta({ issue }: { readonly issue: ValidationIssue }) {
  const parts: string[] = [];
  if (issue.path) parts.push(`path: ${issue.path}`);
  if (issue.componentId) parts.push(`component: ${issue.componentId}`);
  if (issue.surface) parts.push(`surface: ${issue.surface}`);
  if (issue.anchor) parts.push(`anchor: ${issue.anchor}`);
  if (parts.length === 0 && !issue.suggestion) return null;

  return (
    <div className="mt-1 space-y-0.5 text-zinc-500">
      {parts.length > 0 ? <div>{parts.join(" · ")}</div> : null}
      {issue.suggestion ? (
        <div className="text-emerald-400/80">→ {issue.suggestion}</div>
      ) : null}
    </div>
  );
}

export function ValidationPanel({ errors, warnings, notes }: Props) {
  const empty = errors.length === 0 && warnings.length === 0 && notes.length === 0;

  return (
    <section className="space-y-2 border-t border-zinc-800/80 pt-4">
      <h2 className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        Validation
      </h2>
      {empty ? (
        <p className="text-xs text-emerald-400/90">No issues.</p>
      ) : (
        <div className="space-y-2">
          <IssueList title="Errors" issues={errors} tone="error" />
          <IssueList title="Warnings" issues={warnings} tone="warning" />
          <IssueList title="Notes" issues={notes} tone="note" />
        </div>
      )}
    </section>
  );
}
