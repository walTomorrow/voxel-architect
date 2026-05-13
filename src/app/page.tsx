import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Voxel Architect",
  description:
    "Conversational AI for constraint-aware voxel architecture — translate intent and visual inspiration into buildable 3D voxel structures.",
};

/** 12×10 grid: "1" = filled voxel column for a simple tower silhouette */
const VOXEL_PATTERN: string[] = [
  "000000000000",
  "000001100000",
  "000011110000",
  "000011110000",
  "000111111000",
  "000111111000",
  "000111111000",
  "000111111000",
  "000111111000",
  "000111111000",
];

const VOXEL_PALETTE = [
  "bg-emerald-600",
  "bg-emerald-500",
  "bg-teal-600",
  "bg-zinc-500",
  "bg-amber-500/90",
  "bg-sky-600/90",
];

function VoxelPreviewPanel() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/60 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-zinc-700" />
          <span className="size-2.5 rounded-full bg-zinc-700" />
          <span className="size-2.5 rounded-full bg-zinc-700" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          Preview · orthographic
        </span>
        <div className="w-14" aria-hidden />
      </div>
      <div className="relative aspect-[4/3] p-4 sm:p-6 md:p-8">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative flex h-full items-center justify-center [perspective:800px]">
          <div
            className="grid w-full max-w-[min(100%,280px)] gap-0.5 sm:max-w-[320px] sm:gap-1 [transform:rotateX(12deg)_rotateY(-18deg)] [transform-style:preserve-3d] sm:[transform:rotateX(14deg)_rotateY(-22deg)]"
            style={{ gridTemplateColumns: `repeat(12, minmax(0, 1fr))` }}
          >
            {VOXEL_PATTERN.flatMap((row, y) =>
              row.split("").map((cell, x) => {
                if (cell !== "1") {
                  return (
                    <div
                      key={`${x}-${y}`}
                      className="aspect-square rounded-[2px] bg-transparent"
                    />
                  );
                }
                const depthClass =
                  y > 6 ? "shadow-[inset_0_-2px_0_rgba(0,0,0,0.35)]" : "";
                const color =
                  VOXEL_PALETTE[(x + y * 3) % VOXEL_PALETTE.length] ?? "";
                return (
                  <div
                    key={`${x}-${y}`}
                    className={`aspect-square rounded-[3px] ${color} ring-1 ring-black/20 ${depthClass}`}
                  />
                );
              }),
            )}
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-3 left-4 right-4 flex justify-between text-[10px] font-mono text-zinc-600 sm:bottom-4 sm:left-6 sm:right-6">
          <span>Y+</span>
          <span className="text-zinc-700">voxel grid · mock</span>
          <span>X+</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.18),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_0%,rgba(56,189,248,0.08),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_35%_at_0%_100%,rgba(244,244,245,0.06),transparent)]"
      />

      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 pb-20 pt-10 sm:px-8 sm:pb-24 sm:pt-14 md:pt-20">
        <header className="mb-14 flex flex-col gap-6 sm:mb-20 md:mb-24 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-amber-200/90">
                Prototype in Development
              </span>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl md:leading-[1.05]">
                Voxel Architect
              </h1>
              <p className="text-lg font-medium text-emerald-100/90 sm:text-xl md:max-w-xl">
                Conversational AI for constraint-aware voxel architecture.
              </p>
              <p className="max-w-xl text-base leading-relaxed text-zinc-400 sm:text-[17px]">
                Describe a structure in natural language, upload visual
                inspiration, and generate editable{" "}
                <span className="text-zinc-200">3D voxel blueprints</span> that
                respect your constraints. Inspired by how Minecraft builders
                reinterpret real or fictional architecture — framed broadly as a
                way to turn human intent and reference imagery into buildable
                voxel forms.
              </p>
            </div>
            <p className="text-sm text-zinc-500">
              Built as a Stanford CS 153: Frontier Systems project.
            </p>
          </div>

          <div className="w-full shrink-0 md:max-w-md md:pt-2 lg:max-w-lg">
            <VoxelPreviewPanel />
          </div>
        </header>

        <section
          aria-labelledby="features-heading"
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
        >
          <h2 id="features-heading" className="sr-only">
            Features
          </h2>

          <article className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 shadow-lg shadow-black/20 ring-1 ring-white/5 transition-colors hover:border-zinc-700/80 hover:bg-zinc-900/50">
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25">
              <span className="font-mono text-lg" aria-hidden>
                ⌁
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white">
              Prompt-to-Structure
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Go from prose to volumes: the system interprets what you want to
              build and proposes coherent voxel layouts you can refine in
              conversation.
            </p>
          </article>

          <article className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 shadow-lg shadow-black/20 ring-1 ring-white/5 transition-colors hover:border-zinc-700/80 hover:bg-zinc-900/50">
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/25">
              <span className="font-mono text-lg" aria-hidden>
                ◎
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white">
              Image-Guided Design
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Upload reference photos or renders; the model aligns massing,
              rhythm, and materials with your visual anchors while staying
              voxel-native.
            </p>
          </article>

          <article className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 shadow-lg shadow-black/20 ring-1 ring-white/5 transition-colors hover:border-zinc-700/80 hover:bg-zinc-900/50 sm:col-span-2 lg:col-span-1">
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/25">
              <span className="font-mono text-lg" aria-hidden>
                ⧉
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white">
              Constraint-Aware Translation
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Footprint limits, height caps, palette rules, and structural
              plausibility are treated as first-class inputs — not afterthoughts
              — so outputs stay editable and build-ready.
            </p>
          </article>
        </section>

        <footer className="mt-auto border-t border-zinc-800/60 pt-10 text-center text-xs text-zinc-600 sm:pt-14">
          <p>Voxel Architect · conversational voxel design</p>
        </footer>
      </main>
    </div>
  );
}
