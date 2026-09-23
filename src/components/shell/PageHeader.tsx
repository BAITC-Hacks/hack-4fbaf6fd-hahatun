interface PageHeaderProps {
  eyebrow: React.ReactNode;
  title: string;
  lead: string;
}

export function PageHeader({ eyebrow, title, lead }: PageHeaderProps) {
  return (
    <header className="mb-8 max-w-3xl">
      <p className="font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">{eyebrow}</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-base text-muted-foreground">{lead}</p>
    </header>
  );
}
