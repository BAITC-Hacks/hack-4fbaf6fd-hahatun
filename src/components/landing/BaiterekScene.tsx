"use client";

import { useEffect, useRef, useState } from "react";
import { mountBaiterek } from "./baiterek-stage";
import { BaiterekSilhouette } from "./BaiterekSilhouette";

// Client-only (loaded via next/dynamic with ssr: false), so window is safe in the initializer.
const hasWebGL = () => "WebGL2RenderingContext" in window;

export function BaiterekScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [supported] = useState(hasWebGL);

  useEffect(() => {
    const host = hostRef.current;
    if (!supported || !host) return;
    // Every mount builds its own renderer and the cleanup frees it, so the strict-mode double mount is safe.
    return mountBaiterek(host);
  }, [supported]);

  if (!supported) return <BaiterekSilhouette />;
  return (
    <div
      ref={hostRef}
      tabIndex={0}
      role="application"
      aria-roledescription="3D-модель"
      aria-label="Байтерек, 3D-модель. Перетащите или используйте стрелки, чтобы повернуть"
      className="size-full cursor-grab touch-pan-y rounded-xl outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50"
    />
  );
}
