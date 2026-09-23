interface PageHeaderProps {
  /** @deprecated Eyebrows are banned by DESIGN.md; accepted so old callers compile, never rendered. */
  eyebrow?: React.ReactNode;
  title: string;
  lead: string;
  meta?: React.ReactNode; // quiet line under the lead, e.g. the run id
}

export function PageHeader({ title, lead, meta }: PageHeaderProps) {
  return (
    <header className="mb-10 max-w-3xl">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-balance">{title}</h1>
      <p className="mt-3 max-w-[65ch] text-base text-muted-foreground">{lead}</p>
      {meta && <p className="mt-2 text-sm text-muted-foreground">{meta}</p>}
    </header>
  );
}
