import type { Metadata } from "next";
import { BuilderClient } from "@/src/app/builder/BuilderClient";

export const metadata: Metadata = {
  title: "Builder · Voxel Architect",
  description:
    "Describe a building in conversation and preview generated voxel structures — AI builder UI shell.",
};

export default function BuilderPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <BuilderClient />
    </div>
  );
}
