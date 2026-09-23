"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseDataset, type Dataset } from "@/lib/dataset";
import { clearSandbox, setSandbox } from "@/lib/ui/sandbox";
import { DatasetPreview } from "./DatasetPreview";
import { useSandbox } from "./useSandbox";

const MAX_ERRORS = 8;

async function readDataset(file: File): Promise<{ dataset?: Dataset; errors: string[] }> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    return { errors: ["Файл не читается как JSON"] };
  }
  const parsed = parseDataset(raw);
  return parsed.ok ? { dataset: parsed.dataset, errors: [] } : { errors: parsed.errors.slice(0, MAX_ERRORS) };
}

/** Template link, file input, errors or preview, and the switch back to the case data. */
export function SandboxImport() {
  const router = useRouter();
  const active = useSandbox();
  const inputId = useId();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [inputKey, setInputKey] = useState(0); // remount clears the chosen file on cancel

  function cancel() {
    setDataset(null);
    setInputKey((k) => k + 1);
  }

  async function onFile(file: File | undefined) {
    setDataset(null);
    setErrors([]);
    if (!file) return;
    const result = await readDataset(file);
    setErrors(result.errors);
    setDataset(result.dataset ?? null);
  }

  function play() {
    if (!dataset) return;
    setSandbox(dataset);
    router.push("/play");
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {active && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm">
          <p>Сейчас активен: {active.name}</p>
          <Button variant="outline" size="sm" onClick={clearSandbox}>
            Вернуться к данным кейса
          </Button>
        </div>
      )}
      <a
        href="/dataset-hackalem.json"
        download
        className="w-fit text-sm underline underline-offset-4 hover:text-foreground"
      >
        Скачать шаблон (данные кейса, JSON)
      </a>
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-sm font-medium">
          Загрузить датасет
        </label>
        <input
          key={inputKey}
          id={inputId}
          type="file"
          accept="application/json,.json"
          onChange={(e) => void onFile(e.target.files?.[0])}
          className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
        />
      </div>
      {errors.length > 0 && (
        <ul
          role="alert"
          className="flex flex-col gap-1 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive"
        >
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {dataset && <DatasetPreview dataset={dataset} onPlay={play} onCancel={cancel} />}
    </div>
  );
}
