import { FileCheck } from "lucide-react";

export interface MandateInfo {
  change: string; // improvement.change, e.g. "M5 Сарыарка → M3 ЛРТ Нура"
  text: string; // mandate wording from the resolution, shown on hover
}

export function MandateNotice({ change, text }: MandateInfo) {
  return (
    <p
      role="status"
      title={text}
      className="flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm"
    >
      <FileCheck className="size-4 shrink-0 text-outcome-conditions" aria-hidden />
      <span className="truncate">Набор из поручения: {change}</span>
    </p>
  );
}
