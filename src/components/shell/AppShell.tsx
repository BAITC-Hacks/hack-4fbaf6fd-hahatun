import Link from "next/link";
import { AppMark } from "./AppMark";
import { MainNav } from "./MainNav";
import { OrnamentBand } from "./OrnamentBand";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-10 gap-y-4 px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <AppMark className="size-10 shrink-0" />
            <span className="flex flex-col gap-0.5">
              <span className="font-display text-[0.95rem] font-semibold tracking-[0.06em] uppercase">
                Аким на 5 часов
              </span>
              <span className="font-mono text-[0.68rem] tracking-[0.12em] text-muted-foreground uppercase">
                Астана · бюджет 100 у.е. · ровно 5 решений
              </span>
            </span>
          </Link>
          <MainNav />
        </div>
        <OrnamentBand className="block h-3 w-full text-sky" />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
      <footer className="border-t border-border">
        <p className="mx-auto w-full max-w-6xl px-6 py-4 text-xs text-muted-foreground">
          Синтетический датасет HackAlem AI. Числа считает код, тексты пишет LLM.
        </p>
      </footer>
    </>
  );
}
