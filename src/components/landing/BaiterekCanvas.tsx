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
    <figure className="flex flex-col gap-2 lg:-mr-6">
      <div className="h-[420px] w-full lg:h-[660px]">
        <BaiterekScene />
      </div>
      <figcaption className="text-center text-xs text-muted-foreground">
        Байтерек, 97 метров до смотровой площадки — можно покрутить
      </figcaption>
    </figure>
  );
}
