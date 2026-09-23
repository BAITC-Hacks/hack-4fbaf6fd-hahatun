import { FileCheck } from "lucide-react";

export interface MandateInfo {
  change: string; // humanized improvement.change, e.g. "Чистое топливо в Сарыарке → линия ЛРТ в Нуре"
  text: string; // mandate wording from the resolution, shown under the change
}

export function MandateNotice({ change, text }: MandateInfo) {
  return (
    <div role="status" className="flex gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm">
      <FileCheck className="mt-0.5 size-4 shrink-0 text-outcome-conditions" aria-hidden />
      <div className="min-w-0">
        <p>Набор из поручения: {change}</p>
        {/* Some arbiters just repeat the swap; show the wording only when it adds something. */}
        {text && !text.startsWith(change) && <p className="mt-0.5 text-muted-foreground">{text}</p>}
      </div>
    </div>
  );
}
