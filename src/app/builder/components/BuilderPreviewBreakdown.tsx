"use client";

import type { FullStructureBreakdownRow } from "@/src/lib/voxel/blockBreakdown";

type Props = {
  readonly breakdown: readonly FullStructureBreakdownRow[] | null;
  readonly totalCount: number;
};

export function BuilderPreviewBreakdown({ breakdown, totalCount }: Props) {
  return (
    <details className="shrink-0 border-t border-zinc-800/90 bg-zinc-950/98 group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 marker:content-none [&::-webkit-details-marker]:hidden">
        <span>Block breakdown</span>
        <span className="font-mono text-[10px] font-normal normal-case text-zinc-600">
          {totalCount > 0 ? `${totalCount.toLocaleString()} blocks` : "—"}
        </span>
      </summary>
      <div className="max-h-[min(28vh,14rem)] overflow-y-auto border-t border-zinc-800/60 px-4 pb-3 pt-2">
        {breakdown && breakdown.length > 0 ? (
          <ul className="space-y-1 font-mono text-[11px] text-zinc-300">
            {breakdown.map((row) => (
              <li
                key={row.blockTypeId}
                className="flex justify-between gap-3 border-b border-zinc-800/40 py-0.5"
              >
                <span className="min-w-0 truncate" title={row.blockTypeId}>
                  {row.label}
                </span>
                <span className="shrink-0 tabular-nums text-zinc-400">
                  {row.count.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-zinc-600">No structure to analyze.</p>
        )}
      </div>
    </details>
  );
}
