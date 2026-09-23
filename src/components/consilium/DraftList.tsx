interface DraftListProps {
  title: string;
  items: string[];
}

export function DraftList({ title, items }: DraftListProps) {
  return (
    <div>
      <h5 className="mb-1.5 text-sm font-medium">{title}</h5>
      <ul className="list-disc space-y-1 pl-4 text-sm marker:text-muted-foreground">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
