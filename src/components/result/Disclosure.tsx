import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisclosureProps {
  title: React.ReactNode; // rendered straight inside <summary>, so `[details[open]>summary>&]:` variants work on it
  size?: "section" | "inline";
  children?: React.ReactNode;
  className?: string;
}

// Native <details>: closed by default, keyboard and screen-reader support for free.
// The chevron rotates via a direct-child selector, so nested disclosures don't spin each other.
export function Disclosure({ title, size = "inline", children, className }: DisclosureProps) {
  return (
    <details className={className}>
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-2 rounded-md outline-none select-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden",
          size === "section" ? "min-h-14 font-display text-lg font-semibold" : "min-h-11 text-sm font-medium",
        )}
      >
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none [details[open]>summary>&]:rotate-90"
        />
        {title}
      </summary>
      {children && <div className={size === "section" ? "pt-2 pb-8" : "pt-2 pb-6"}>{children}</div>}
    </details>
  );
}
