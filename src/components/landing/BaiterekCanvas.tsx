"use client";

import dynamic from "next/dynamic";
import { BaiterekSilhouette } from "./BaiterekSilhouette";

// three.js ships only with this chunk, and only the landing page imports it.
const BaiterekScene = dynamic(() => import("./BaiterekScene").then((m) => m.BaiterekScene), {
  ssr: false,
  loading: () => <BaiterekSilhouette />,
});

export function BaiterekCanvas() {
  return (
    <figure className="flex flex-col items-center gap-2">
      <div className="h-[360px] w-full lg:h-[520px]">
        <BaiterekScene />
      </div>
      <figcaption className="text-xs text-muted-foreground">Байтерек — можно покрутить</figcaption>
    </figure>
  );
}
