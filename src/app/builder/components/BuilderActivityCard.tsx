"use client";

import type { BuilderActivityStep } from "@/src/lib/builder/mockBuilderActivity";

type Props = {
  readonly steps: readonly BuilderActivityStep[];
};

export function BuilderActivityCard({ steps }: Props) {
  return (
    <details className="mt-2 w-full max-w-[95%] rounded-xl border border-zinc-700/60 bg-zinc-900/70">
      <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-medium text-zinc-400 marker:content-none [&::-webkit-details-marker]:hidden">
        Build activity
      </summary>
      <ul className="space-y-1 border-t border-zinc-800/80 px-3 py-2">
        {steps.map((step) => (
          <li key={step.id} className="flex items-start gap-2 text-[11px] text-zinc-400">
            <span
              className={
                step.status === "error"
                  ? "text-red-400/90"
                  : "text-emerald-400/90"
              }
              aria-hidden
            >
              {step.status === "error" ? "✕" : "✓"}
            </span>
            <span>{step.label}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
