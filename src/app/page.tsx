import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Voxel Architect",
  description:
    "Conversational AI for constraint-aware voxel architecture — translate intent and visual inspiration into buildable 3D voxel structures.",
};

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

      <main className="relative mx-auto flex min-h-screen w-full max-w-[min(100%,88rem)] flex-1 flex-col px-6 pb-24 pt-12 sm:px-10 sm:pb-28 sm:pt-16 md:px-12 md:pt-20 lg:px-16 lg:pb-32 xl:px-20">
        <header className="mb-16 text-center sm:mb-20 lg:mb-28">
          <div className="mx-auto w-full max-w-5xl space-y-8 lg:max-w-6xl lg:space-y-10 xl:max-w-7xl">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-amber-200/90 sm:px-4 sm:text-xs">
                Prototype in Development
              </span>
            </div>
            <div className="space-y-5 lg:space-y-6">
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl md:text-7xl md:leading-[1.04] lg:text-7xl xl:text-8xl xl:leading-[1.02]">
                Voxel Architect
              </h1>
              <p className="mx-auto max-w-4xl text-lg font-medium leading-snug text-emerald-100/90 sm:text-xl md:text-2xl md:leading-snug lg:text-[1.65rem] lg:leading-snug">
                Conversational AI for constraint-aware voxel architecture.
              </p>
              <p className="mx-auto max-w-3xl text-base leading-relaxed text-zinc-400 sm:max-w-4xl sm:text-lg sm:leading-relaxed md:max-w-5xl lg:max-w-6xl lg:text-xl lg:leading-[1.7]">
                Describe a structure in natural language, upload visual
                inspiration, and generate editable{" "}
                <span className="text-zinc-200">3D voxel blueprints</span> that
                respect your constraints. Inspired by how Minecraft builders
                reinterpret real or fictional architecture — framed broadly as a
                way to turn human intent and reference imagery into buildable
                voxel forms.
              </p>
            </div>
            <p className="text-sm text-zinc-500 sm:text-base">
              Built as a Stanford CS 153: Frontier Systems project.
            </p>

            <div className="mx-auto w-full max-w-3xl space-y-4 border-t border-zinc-800/80 pt-10 sm:max-w-4xl lg:max-w-5xl lg:space-y-5 lg:pt-12">
              <p className="text-sm leading-relaxed text-zinc-400 sm:text-base lg:text-lg">
                Open the interactive voxel demo: orbit, zoom, and inspect a
                generated voxel structures in full view.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/builder"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/40 bg-gradient-to-b from-emerald-500/20 to-emerald-600/10 px-8 py-5 text-center text-lg font-semibold tracking-tight text-white shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/20 transition hover:border-emerald-300/55 hover:from-emerald-500/28 hover:to-emerald-600/18 hover:ring-emerald-400/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/70 sm:py-6 sm:text-xl lg:flex-1 lg:py-7 lg:text-2xl"
                >
                  Open Builder
                  <span aria-hidden className="text-emerald-200/90">
                    →
                  </span>
                </Link>
                <Link
                  href="/preview"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-600/80 bg-zinc-900/50 px-8 py-5 text-center text-lg font-semibold tracking-tight text-zinc-200 ring-1 ring-zinc-700/60 transition hover:border-zinc-500 hover:bg-zinc-800/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400/70 sm:py-6 sm:text-xl lg:flex-1 lg:py-7 lg:text-2xl"
                >
                  View 3D preview
                  <span aria-hidden className="text-zinc-400">
                    →
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        <section
          aria-labelledby="features-heading"
          className="grid w-full gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-8 xl:gap-10"
        >
          <h2 id="features-heading" className="sr-only">
            Features
          </h2>

          <article className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 text-center shadow-lg shadow-black/20 ring-1 ring-white/5 transition-colors hover:border-zinc-700/80 hover:bg-zinc-900/50 sm:p-8 lg:p-10">
            <div className="mx-auto mb-5 flex size-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25 sm:size-12">
              <span className="font-mono text-xl" aria-hidden>
                ⌁
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white sm:text-xl">
              Prompt-to-Structure
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base sm:leading-relaxed lg:text-[1.05rem] lg:leading-relaxed">
              Go from prose to volumes: the system interprets what you want to
              build and proposes coherent voxel layouts you can refine in
              conversation.
            </p>
          </article>

          <article className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 text-center shadow-lg shadow-black/20 ring-1 ring-white/5 transition-colors hover:border-zinc-700/80 hover:bg-zinc-900/50 sm:p-8 lg:p-10">
            <div className="mx-auto mb-5 flex size-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/25 sm:size-12">
              <span className="font-mono text-xl" aria-hidden>
                ◎
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white sm:text-xl">
              Image-Guided Design
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base sm:leading-relaxed lg:text-[1.05rem] lg:leading-relaxed">
              Upload reference photos or renders; the model aligns massing,
              rhythm, and materials with your visual anchors while staying
              voxel-native.
            </p>
          </article>

          <article className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 text-center shadow-lg shadow-black/20 ring-1 ring-white/5 transition-colors hover:border-zinc-700/80 hover:bg-zinc-900/50 sm:col-span-2 sm:p-8 lg:col-span-1 lg:p-10">
            <div className="mx-auto mb-5 flex size-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/25 sm:size-12">
              <span className="font-mono text-xl" aria-hidden>
                ⧉
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white sm:text-xl">
              Constraint-Aware Translation
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base sm:leading-relaxed lg:text-[1.05rem] lg:leading-relaxed">
              Footprint limits, height caps, palette rules, and structural
              plausibility are treated as first-class inputs — not afterthoughts
              — so outputs stay editable and build-ready.
            </p>
          </article>
        </section>

        <footer className="mt-auto border-t border-zinc-800/60 pt-12 text-center text-sm text-zinc-600 sm:pt-16 lg:text-base">
          <p>Voxel Architect · conversational voxel design</p>
        </footer>
      </main>
    </div>
  );
}
