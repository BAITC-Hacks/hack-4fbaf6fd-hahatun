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
  const onLeaderboard = pathname.startsWith("/leaderboard");
  const onSandbox = pathname.startsWith("/sandbox");

  return (
    <nav aria-label="Навигация" className="flex items-center gap-2 py-1 text-sm whitespace-nowrap sm:gap-4">
      <ol aria-label="Этапы игры" className="flex items-center gap-0.5 sm:gap-2">
        {STEPS.map((step, i) => {
          const current = step.isCurrent(pathname);
          const inner = (
            <>
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full border text-xs font-medium tabular-nums",
                  current
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              {/* On phones only the current step keeps its label, so the row fits 320px. */}
              <span
                className={cn(
                  current ? "font-medium" : "text-muted-foreground group-hover:text-foreground",
                  !current && "sr-only sm:not-sr-only",
                )}
              >
                {step.label}
              </span>
            </>
          );
          return (
            <li key={step.label} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true" className="h-px w-2 bg-input sm:w-6" />}
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
      <span aria-hidden="true" className="h-5 w-px bg-input" />
      <Link
        href="/leaderboard"
        aria-current={onLeaderboard ? "page" : undefined}
        className={cn(
          "rounded-md p-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          onLeaderboard ? "font-medium" : "text-muted-foreground hover:text-foreground",
        )}
      >
        Лидерборд
      </Link>
      <Link
        href="/sandbox"
        aria-current={onSandbox ? "page" : undefined}
        className={cn(
          "rounded-md p-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          onSandbox ? "font-medium" : "text-muted-foreground hover:text-foreground",
        )}
      >
        Песочница
      </Link>
    </nav>
  );
}
