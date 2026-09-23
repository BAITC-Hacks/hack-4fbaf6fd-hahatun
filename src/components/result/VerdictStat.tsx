interface VerdictStatProps {
  label: string;
  children: React.ReactNode;
}

// One row of the verdict's definition list: label left, value right, hairline between rows; lives inside a <dl>.
export function VerdictStat({ label, children }: VerdictStatProps) {
  return (
    <div className="col-span-2 grid grid-cols-subgrid gap-x-6 border-t border-border py-2 first:border-t-0 first:pt-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
