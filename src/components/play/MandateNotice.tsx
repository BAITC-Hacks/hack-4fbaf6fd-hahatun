import { FileCheck } from "lucide-react";

export interface MandateInfo {
  change: string; // improvement.change, e.g. "M5 Сарыарка → M3 ЛРТ Нура"
  text: string; // mandate wording from the resolution
}

export function MandateNotice({ change, text }: MandateInfo) {
  return (
    <div role="status" className="flex gap-3 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3">
      <FileCheck className="mt-0.5 size-4 shrink-0 text-outcome-conditions" aria-hidden />
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">Набор из поручения: {change}</p>
        <p className="text-xs text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
