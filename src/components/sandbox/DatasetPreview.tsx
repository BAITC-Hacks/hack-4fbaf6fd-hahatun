import { Button } from "@/components/ui/button";
import type { Dataset } from "@/lib/dataset";
import { calculate } from "@/lib/engine";
import { formatPercent, formatScore } from "@/lib/ui/format";

interface DatasetPreviewProps {
  dataset: Dataset;
  onPlay(): void;
  onCancel(): void;
}

/** What the file contains, counted by the engine on its own weights: shares, D before measures, base Score. */
export function DatasetPreview({ dataset, onPlay, onCancel }: DatasetPreviewProps) {
  const base = calculate({ decisions: [] }, [], dataset);
  const dBefore = new Map(base.districts.map((d) => [d.id, d.dBefore]));
  return (
    <section aria-labelledby="ds-preview" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <h2 id="ds-preview" className="font-display text-lg font-semibold">
        {dataset.name}
      </h2>
      <table className="w-full max-w-xl text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th scope="col" className="py-2 text-left font-normal">
              Район
            </th>
            <th scope="col" className="py-2 text-right font-normal">
              Доля населения
            </th>
            <th scope="col" className="py-2 text-right font-normal">
              D до мер
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border border-t border-border">
          {dataset.districts.map((d) => (
            <tr key={d.id}>
              <td className="py-2">{d.name}</td>
              <td className="py-2 text-right tabular-nums">{formatPercent(d.population)}</td>
              <td className="py-2 text-right tabular-nums">{formatScore(dBefore.get(d.id) ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm">
        Базовый Score:{" "}
        <span className="font-display text-lg font-semibold tabular-nums">{formatScore(base.baseScore)}</span>
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={onPlay}>Играть на этих данных</Button>
        <Button variant="outline" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </section>
  );
}
