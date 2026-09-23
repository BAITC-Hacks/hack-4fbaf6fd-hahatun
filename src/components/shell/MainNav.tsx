"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
  href?: string;
  isCurrent: (path: string) => boolean;
}

// Result has no static URL: it opens after the consilium returns a runId.
const STEPS: Step[] = [
  { label: "Брифинг", href: "/", isCurrent: (p) => p === "/" },
  { label: "Кабинет", href: "/play", isCurrent: (p) => p.startsWith("/play") },
  { label: "Вердикт", isCurrent: (p) => p.startsWith("/result") },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Этапы игры">
      <ol className="flex items-center gap-2 text-sm">
        {STEPS.map((step, i) => {
          const current = step.isCurrent(pathname);
          const inner = (
            <>
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full border font-mono text-xs tabular-nums",
                  current
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              <span className={current ? "font-medium" : "text-muted-foreground group-hover:text-foreground"}>
                {step.label}
              </span>
            </>
          );
          return (
            <li key={step.label} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true" className="h-px w-5 bg-input" />}
              {step.href && !current ? (
                <Link
                  href={step.href}
                  className="group flex items-center gap-2 rounded-md p-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {inner}
                </Link>
              ) : (
                <span
                  aria-current={current ? "step" : undefined}
                  aria-disabled={current ? undefined : true}
                  title={current ? undefined : "Откроется после консилиума"}
                  className="flex items-center gap-2 p-1"
                >
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
