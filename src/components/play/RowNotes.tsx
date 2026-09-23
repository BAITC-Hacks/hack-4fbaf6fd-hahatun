"use client";

import type { DistrictId } from "@/lib/types";
import type { RelationHint } from "@/lib/ui/cabinet";
import { cn } from "@/lib/utils";
import { DistrictPicker } from "./DistrictPicker";

interface RowNotesProps {
  measureTitle: string;
  needsDistrict: boolean; // selected district measure
  districtId?: DistrictId;
  hints: RelationHint[];
  onDistrictChange(id: DistrictId): void;
}

/** Second line of a catalogue row: district picker and synergy/conflict notes, only when relevant. */
export function RowNotes({ measureTitle, needsDistrict, districtId, hints, onDistrictChange }: RowNotesProps) {
  if (!needsDistrict && hints.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 pb-2 pl-10">
      {needsDistrict && <DistrictPicker measureTitle={measureTitle} value={districtId} onChange={onDistrictChange} />}
      {hints.map((h) => (
        <p key={h.text} className={cn("text-sm", h.tone === "conflict" ? "text-destructive" : "text-accent-foreground")}>
          {h.text}
        </p>
      ))}
    </div>
  );
}
