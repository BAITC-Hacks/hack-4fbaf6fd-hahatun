interface HallSectionProps {
  title: string;
  hint?: string;
  children: React.ReactNode;
}

export function HallSection({ title, hint, children }: HallSectionProps) {
  return (
    <section className="space-y-4">
      <div className="border-b border-border pb-2">
        <h3 className="font-display text-sm font-semibold tracking-[0.08em] uppercase">{title}</h3>
        {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
