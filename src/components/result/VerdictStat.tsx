interface VerdictStatProps {
  label: string;
  children: React.ReactNode;
}

// One label/value pair in the verdict header grid; must live inside a <dl>.
export function VerdictStat({ label, children }: VerdictStatProps) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}
