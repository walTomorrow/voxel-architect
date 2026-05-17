import type { Metadata } from "next";
import Link from "next/link";
import { GenericLabClient } from "@/src/app/generic-lab/GenericLabClient";

export const metadata: Metadata = {
  title: "Generic blueprint lab · Voxel Architect",
  description:
    "Developer lab for editing GenericBuildingBlueprint presets — validate, generate, and inspect in 3D.",
};

export default function GenericLabPage() {
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
          <span className="font-medium uppercase tracking-widest text-zinc-600">
            Generic blueprint lab
          </span>
          <Link
            href="/preview"
            className="rounded border border-zinc-700 px-2 py-1 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
          >
            ← Preview
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <GenericLabClient />
      </div>
    </div>
  );
}
