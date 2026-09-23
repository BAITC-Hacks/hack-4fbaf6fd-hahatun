import Link from "next/link";
import { AppMark } from "./AppMark";
import { MainNav } from "./MainNav";

// One calm row: dial mark + name on the left, the step row on the right; a hairline underneath.
export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-1 px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <AppMark className="size-9 shrink-0 sm:size-10" />
          <span className="font-display text-[0.8rem] font-semibold whitespace-nowrap sm:text-base">
            Аким на 5 часов в Астане
          </span>
        </Link>
        <MainNav />
      </div>
    </header>
  );
}
