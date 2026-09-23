"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Decision, MeasureId, ValidationError } from "@/lib/types";
import { BudgetBar } from "./BudgetBar";
import { LiveScore } from "./LiveScore";
import { SlotList } from "./SlotList";
import { ValidationErrors } from "./ValidationErrors";

export interface SetPanelProps {
  decisions: Decision[];
  cost: number;
  errors: ValidationError[];
  score: number | null; // engine score on the client, null while invalid
  baseScore: number;
  canSubmit: boolean; // validate(...).ok
  submitting?: boolean;
  onRemove(id: MeasureId): void;
  onReset(): void;
  onSubmit(): void;
}

/** The basket: score, budget, five slots, what is wrong, one button. */
export function SetPanel(props: SetPanelProps) {
  const { decisions, cost, errors, score, baseScore, canSubmit, submitting = false } = props;
  return (
    <aside
      aria-label="Ваш набор"
      className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5 md:sticky md:top-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Ваш набор</h2>
        <button
          type="button"
          disabled={decisions.length === 0}
          onClick={props.onReset}
          className="rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 disabled:invisible"
        >
          Сбросить набор
        </button>
      </div>
      <LiveScore score={score} baseScore={baseScore} />
      <BudgetBar cost={cost} />
      <SlotList decisions={decisions} onRemove={props.onRemove} />
      <ValidationErrors errors={errors} />
      <Button size="lg" className="h-10" disabled={!canSubmit || submitting} onClick={props.onSubmit}>
        {submitting ? "Отправляем…" : "На консилиум"}
        {!submitting && <ArrowRight data-icon="inline-end" />}
      </Button>
    </aside>
  );
}
