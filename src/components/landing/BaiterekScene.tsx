"use client";

import { useEffect, useRef, useState } from "react";
import { mountBaiterek } from "./baiterek-stage";
import { BaiterekSilhouette } from "./BaiterekSilhouette";
import { anchorReadout, HeightReadout, paintReadout } from "./HeightReadout";

// Client-only (loaded via next/dynamic with ssr: false), so window is safe in the initialiser.
// Probe a real context: the constructor may exist while the GPU is blocklisted or the context is refused.
const hasWebGL = () => {
  try {
    if (!("WebGL2RenderingContext" in window)) return false;
    const canvas = document.createElement("canvas");
    return canvas.getContext("webgl2") !== null;
  } catch {
    return false;
  }
};

export function BaiterekScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState(hasWebGL);

  useEffect(() => {
    const host = hostRef.current;
    const readout = readoutRef.current;
    if (!supported || !host || !readout) return;
    // Every mount builds its own renderer and the cleanup frees it, so the strict-mode double mount is safe.
    try {
      return mountBaiterek(host, {
        onLift: (metres) => paintReadout(readout, metres),
        onAnchors: (bottom, top) => anchorReadout(readout, bottom, top),
      });
    } catch {
      // Renderer failed after the probe passed (lost context, driver error): fall back to the static
      // silhouette instead of crashing the landing page together with the team form.
      const timer = setTimeout(() => setSupported(false), 0);
      return () => clearTimeout(timer);
    }
  }, [supported]);

  if (!supported) return <BaiterekSilhouette />;
  return (
    <div className="relative size-full">
      <div
        ref={hostRef}
        tabIndex={0}
        role="application"
        aria-roledescription="3D-модель"
        aria-label="Байтерек, 3D-модель. Перетащите или используйте стрелки, чтобы повернуть"
        className="size-full cursor-grab touch-pan-y outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <HeightReadout ref={readoutRef} />
    </div>
  );
}
