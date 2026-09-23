"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Direction, ValidationError } from "@/lib/types";
import { BudgetBar } from "./BudgetBar";
import { DecisionCounter } from "./DecisionCounter";
import { DirectionLimits } from "./DirectionLimits";
import { LiveScore } from "./LiveScore";
import { ValidationErrors } from "./ValidationErrors";

export interface BudgetPanelProps {
  cost: number;
  count: number;
  directionCounts: Record<Direction, number>;
  errors: ValidationError[];
  score: number | null; // engine score on the client, null while invalid
  baseScore: number;
  canSubmit: boolean; // validate(...).ok
  submitting?: boolean;
  onSubmit(): void;
}

export function BudgetPanel(props: BudgetPanelProps) {
  const { cost, count, directionCounts, errors, score, baseScore, canSubmit, submitting = false, onSubmit } = props;
  return (
    <aside
      aria-label="Сводка набора"
      className="sticky top-6 flex flex-col gap-4 rounded-lg border border-border bg-card p-5"
    >
      <LiveScore score={score} baseScore={baseScore} />
      <Separator />
      <BudgetBar cost={cost} />
      <DecisionCounter count={count} />
      <DirectionLimits counts={directionCounts} />
      <ValidationErrors errors={errors} />
      <Button size="lg" className="h-10" disabled={!canSubmit || submitting} onClick={onSubmit}>
        {submitting ? "Отправляем…" : "На консилиум"}
        {!submitting && <ArrowRight data-icon="inline-end" />}
      </Button>
      {!canSubmit && (
        <p className="-mt-2 text-center text-xs text-muted-foreground">Кнопка откроется, когда набор пройдёт проверку</p>
      )}
    </aside>
  );
}
