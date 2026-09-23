import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Resolution } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { formatDelta, formatScore } from "@/lib/ui/format";
import { cn } from "@/lib/utils";

interface MandateItemProps {
  mandate: Resolution["mandates"][number];
  index: number; // position in resolution.mandates, read by /play (task M6)
  runId: string;
}

export function MandateItem({ mandate, index, runId }: MandateItemProps) {
  const { improvement } = mandate;
  const href = `/play?from=${encodeURIComponent(runId)}&mandate=${index}`;
  return (
    <li className="space-y-2 pl-1">
      <p className="max-w-[70ch] leading-relaxed">{mandate.text}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="text-muted-foreground">{improvement.change}</span>
        <span className="tabular-nums">
          Score {formatScore(improvement.score)}{" "}
          <span className={improvement.delta > 0 ? "text-outcome-approve" : "text-destructive"}>
            {formatDelta(improvement.delta)}
          </span>
        </span>
        <Link href={href} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-auto")}>
          Применить поручение
          <ArrowRight data-icon="inline-end" />
        </Link>
      </div>
    </li>
  );
}
