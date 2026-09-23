import { z } from "zod";

// Validation messages for the import page in Russian.
z.config(z.locales.ru());
import { CONFLICTS, DISTRICTS, MEASURES, SYNERGIES, WEIGHTS } from "@/lib/data";
import type { Conflict, District, Indicator, Measure, Synergy } from "@/lib/types";

// Sandbox datasets: same indicator codes, districts and measure ids as the case, different values.
// Competition runs always use DEFAULT_DATASET, so every team starts from the same data (brief criterion 1).

export interface Dataset {
  name: string;
  districts: District[];
  measures: Measure[];
  weights: Record<Indicator, number>;
  synergies: Synergy[];
  conflicts: Conflict[];
}

export const DEFAULT_DATASET_NAME = "HackAlem: датасет кейса";

export const DEFAULT_DATASET: Dataset = {
  name: DEFAULT_DATASET_NAME,
  districts: DISTRICTS,
  measures: MEASURES,
  weights: WEIGHTS,
  synergies: SYNERGIES,
  conflicts: CONFLICTS,
};

const INDICATOR_CODES = ["T1", "T2", "E1", "E2", "S1", "S2", "B1", "B2", "C1", "C2"] as const;
const DISTRICT_IDS = ["esil", "almaty", "saryarka", "baikonur", "nura"] as const;
const MEASURE_IDS = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12", "M13", "M14"] as const;
const DIRECTIONS = ["transport", "ecology", "social", "safety", "service"] as const;

const value = z.number().finite().min(0).max(100);
const indicators = z.object(Object.fromEntries(INDICATOR_CODES.map((k) => [k, value])) as Record<Indicator, typeof value>);
const effects = z.partialRecord(z.enum(INDICATOR_CODES), z.number().finite().min(-100).max(100));

export const datasetSchema = z
  .object({
    name: z.string().trim().min(1).max(80).regex(/^[^\n\r]+$/),
    districts: z
      .array(
        z.object({
          id: z.enum(DISTRICT_IDS),
          name: z.string().trim().min(1).max(40),
          population: z.number().finite().gt(0).lt(1),
          profile: z.string().max(200).default(""),
          indicators,
        }),
      )
      .length(5),
    measures: z
      .array(
        z.object({
          id: z.enum(MEASURE_IDS),
          direction: z.enum(DIRECTIONS),
          title: z.string().trim().min(1).max(120),
          scope: z.enum(["district", "city"]),
          cost: z.number().int().min(1).max(100),
          lag: z.number().int().min(0).max(7),
          effects,
        }),
      )
      .length(14),
    weights: z.object(Object.fromEntries(INDICATOR_CODES.map((k) => [k, z.number().finite().min(0).max(1)])) as Record<Indicator, z.ZodNumber>),
    synergies: z
      .array(z.object({ pair: z.tuple([z.enum(MEASURE_IDS), z.enum(MEASURE_IDS)]), indicator: z.enum(INDICATOR_CODES), bonus: z.number().finite().min(-20).max(20) }))
      .max(20),
    conflicts: z
      .array(z.object({ pair: z.tuple([z.enum(MEASURE_IDS), z.enum(MEASURE_IDS)]), sameDistrictOnly: z.boolean(), reason: z.string().max(200) }))
      .max(20),
  })
  .superRefine((d, ctx) => {
    const unique = (ids: string[]) => new Set(ids).size === ids.length;
    if (!unique(d.districts.map((x) => x.id))) ctx.addIssue({ code: "custom", message: "Районы должны быть все пять, без повторов" });
    if (!unique(d.measures.map((x) => x.id))) ctx.addIssue({ code: "custom", message: "Меры M1–M14 должны быть все, без повторов" });
    const pop = d.districts.reduce((s, x) => s + x.population, 0);
    if (Math.abs(pop - 1) > 0.001) ctx.addIssue({ code: "custom", message: `Сумма долей населения ${pop.toFixed(3)}, нужна 1` });
    const w = Object.values(d.weights).reduce((s, x) => s + x, 0);
    if (Math.abs(w - 1) > 0.001) ctx.addIssue({ code: "custom", message: `Сумма весов показателей ${w.toFixed(3)}, нужна 1` });
    const byId = new Map(d.measures.map((m) => [m.id, m]));
    for (const s of d.synergies) {
      if (byId.get(s.pair[0])?.scope !== "district") ctx.addIssue({ code: "custom", message: `Синергия ${s.pair.join("+")}: первая мера должна быть районной` });
    }
  });

export type DatasetInput = z.input<typeof datasetSchema>;

export type ParseResult = { ok: true; dataset: Dataset } | { ok: false; errors: string[] };

export function parseDataset(raw: unknown): ParseResult {
  const parsed = datasetSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.slice(0, 8).map((i) => `${i.path.join(".") || "файл"}: ${i.message}`) };
  }
  const d = parsed.data;
  // keep the case's canonical order so indices and labels stay stable
  const districts = DISTRICTS.map((base) => d.districts.find((x) => x.id === base.id)!);
  const measures = MEASURES.map((base) => d.measures.find((x) => x.id === base.id)!) as Measure[];
  return { ok: true, dataset: { name: d.name, districts, measures, weights: d.weights, synergies: d.synergies, conflicts: d.conflicts } };
}

const contentKey = (d: Dataset) =>
  JSON.stringify([d.districts, d.measures, d.weights, d.synergies, d.conflicts]);
const DEFAULT_CONTENT_KEY = contentKey(DEFAULT_DATASET);

// The name alone is not enough: an upload may reuse the case's name with different numbers.
export function isDefaultDataset(d: Dataset | undefined): boolean {
  if (!d || d === DEFAULT_DATASET) return true;
  return d.name === DEFAULT_DATASET_NAME && contentKey(d) === DEFAULT_CONTENT_KEY;
}
