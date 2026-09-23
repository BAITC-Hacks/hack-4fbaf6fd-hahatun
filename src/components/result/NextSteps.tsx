import Link from "next/link";
import type { Run } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { DeltaValue } from "@/components/result/DeltaValue";
import { formatScore } from "@/lib/ui/format";
import { nextSteps } from "@/lib/ui/verdict";

// One obvious next move: the arbiter's mandates as numbered rows, the first one as the primary button.
export function NextSteps({ run }: { run: Run }) {
  const steps = nextSteps(run);
  return (
    <section aria-labelledby="next-steps" className="flex flex-col gap-3">
      <div className="border-b border-border pb-2">
        <h2 id="next-steps" className="font-display text-lg font-semibold">
          Что сделать дальше
        </h2>
        {steps.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">Замените одну меру: кабинет откроется с готовым набором.</p>
        )}
      </div>
      {steps.length === 0 ? (
        <p className="text-muted-foreground">Консилиум не нашёл улучшений заменой одной меры.</p>
      ) : (
        <ol className="divide-y divide-border">
          {steps.map((step, i) => (
            <li key={step.href} className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3">
              <span className="w-4 font-mono text-sm text-muted-foreground tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1 basis-64">{step.change}</span>
              <span className="text-sm text-muted-foreground">
                Score <span className="font-medium text-foreground tabular-nums">{formatScore(step.score)}</span>
              </span>
              <DeltaValue value={step.delta} className="w-16 text-sm" />
              <Link href={step.href} className={buttonVariants({ variant: i === 0 ? "default" : "outline", size: "sm" })}>
                Применить
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
