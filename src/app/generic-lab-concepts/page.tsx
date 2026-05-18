import type { Metadata } from "next";
import Link from "next/link";
import { GenericLabConceptsClient } from "@/src/app/generic-lab-concepts/GenericLabConceptsClient";

export const metadata: Metadata = {
  title: "Generic lab UI concepts (pass 3) · Voxel Architect",
  description:
    "UI concept exploration — engine IDE, surface build, world builder, operation blocks, hybrid workbench.",
};

export default function GenericLabConceptsPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-800/90 bg-zinc-950 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-sm font-medium text-zinc-200 transition hover:text-white"
        >
          <span
            className="text-zinc-500 transition group-hover:text-emerald-400"
            aria-hidden
          >
            ←
          </span>
          Return to home
        </Link>
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          <span className="rounded border border-amber-500/40 bg-amber-950/30 px-2 py-0.5 font-medium text-amber-200/90">
            Pass 3 · one live VoxelViewer per tab
          </span>
          <Link
            href="/generic-lab"
            className="rounded border border-zinc-700 px-2 py-1 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
          >
            Live lab →
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <GenericLabConceptsClient />
      </div>
    </div>
  );
}
