import { cn } from "@/lib/utils";

interface LiveMessageProps {
  title: string;
  tone?: "neutral" | "destructive";
  children?: React.ReactNode; // actions under the text
}

// Boxed notice for the states where the live run cannot go on (missing set, error, dropped link).
export function LiveMessage({ title, tone = "neutral", children }: LiveMessageProps) {
  return (
    <div
      role={tone === "destructive" ? "alert" : "status"}
      className={cn(
        "space-y-4 rounded-xl p-6 ring-1",
        tone === "destructive" ? "bg-destructive/5 ring-destructive/30" : "bg-card ring-foreground/10",
      )}
    >
      <p className={cn("font-medium", tone === "destructive" && "text-destructive")}>{title}</p>
      {children && <div className="flex flex-wrap gap-3">{children}</div>}
    </div>
  );
}
