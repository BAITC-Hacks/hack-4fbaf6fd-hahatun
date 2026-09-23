import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Run } from "@/lib/types";

// JSON files in data/runs/<id>.json (override with DATA_DIR).
export type RunSummary = Pick<Run, "id" | "teamName" | "createdAt">;

const ID_RE = /^[A-Za-z0-9_-]+$/;

function runsDir(): string {
  return process.env.DATA_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), "data", "runs");
}

function fileFor(id: string): string {
  if (!ID_RE.test(id)) throw new Error(`invalid run id: ${JSON.stringify(id)}`);
  return path.join(runsDir(), `${id}.json`);
}

const isNotFound = (err: unknown) => (err as NodeJS.ErrnoException)?.code === "ENOENT";

export async function saveRun(run: Run): Promise<void> {
  const file = fileFor(run.id);
  await mkdir(runsDir(), { recursive: true });
  await writeFile(file, JSON.stringify(run, null, 2), "utf8");
}

export async function loadRun(id: string): Promise<Run | null> {
  if (!ID_RE.test(id)) return null;
  try {
    return JSON.parse(await readFile(/* turbopackIgnore: true */ fileFor(id), "utf8")) as Run;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

async function readSummary(file: string): Promise<RunSummary | null> {
  try {
    const run = JSON.parse(await readFile(/* turbopackIgnore: true */ path.join(runsDir(), file), "utf8")) as Partial<Run>;
    if (typeof run.id !== "string" || typeof run.teamName !== "string" || typeof run.createdAt !== "string") {
      return null;
    }
    return { id: run.id, teamName: run.teamName, createdAt: run.createdAt };
  } catch {
    return null; // broken file: skip it, the list must still render
  }
}

export async function listRuns(): Promise<RunSummary[]> {
  let files: string[];
  try {
    files = (await readdir(/* turbopackIgnore: true */ runsDir())).filter((f) => f.endsWith(".json"));
  } catch (err) {
    if (isNotFound(err)) return [];
    throw err;
  }
  const summaries = await Promise.all(files.map(readSummary));
  return summaries
    .filter((s): s is RunSummary => s !== null)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
