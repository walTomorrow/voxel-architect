import type { Metadata } from "next";
import { VisualizerClient } from "./VisualizerClient";

export const metadata: Metadata = {
  title: "Visualizer · Voxel Architect",
  description:
    "Inspect a validated medieval tower blueprint and its generated voxel structure.",
};

export default function VisualizerPage() {
  return <VisualizerClient />;
}
