import type { Metadata } from "next";
import Link from "next/link";
import { VoxelPreviewPanel } from "@/src/components/voxel/VoxelPreviewPanel";

export const metadata: Metadata = {
  title: "3D preview · Voxel Architect",
  description:
    "Interactive voxel preview of the sample structure — orbit, zoom, and inspect the demo build.",
};

export default function PreviewPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-800/90 bg-zinc-950 px-4 py-3 sm:px-6">
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
        <span className="hidden text-xs font-medium uppercase tracking-widest text-zinc-600 sm:inline">
          Sample build
        </span>
      </header>

      <div className="min-h-0 flex-1">
        <VoxelPreviewPanel mode="immersive" />
      </div>
    </div>
  );
}
