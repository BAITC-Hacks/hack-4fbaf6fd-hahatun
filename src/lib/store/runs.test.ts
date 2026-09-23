import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sample from "../../../fixtures/sample-run.json";
import type { Run } from "@/lib/types";
import { listRuns, loadRun, saveRun } from "./runs";

const base = sample as unknown as Run;
const make = (id: string, createdAt: string, teamName = "Команда"): Run => ({ ...base, id, createdAt, teamName });

describe("store/runs", () => {
  let dir: string;
  const prev = process.env.DATA_DIR;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "runs-"));
    process.env.DATA_DIR = path.join(dir, "nested", "runs"); // created on first write
  });

  afterEach(async () => {
    if (prev === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = prev;
    await rm(dir, { recursive: true, force: true });
  });

  it("returns an empty list before anything is saved", async () => {
    expect(await listRuns()).toEqual([]);
  });

  it("round-trips save, load and list sorted by createdAt desc", async () => {
    const older = make("run-old", "2026-09-23T10:00:00.000Z", "A");
    const newer = make("run_new", "2026-09-23T11:00:00.000Z", "B");
    await saveRun(older);
    await saveRun(newer);

    expect(await loadRun("run-old")).toEqual(older);
    expect(await listRuns()).toEqual([
      { id: "run_new", teamName: "B", createdAt: newer.createdAt },
      { id: "run-old", teamName: "A", createdAt: older.createdAt },
    ]);
  });

  it("skips broken files when listing", async () => {
    await saveRun(make("ok", "2026-09-23T10:00:00.000Z"));
    await writeFile(path.join(process.env.DATA_DIR!, "broken.json"), "{not json", "utf8");
    await writeFile(path.join(process.env.DATA_DIR!, "partial.json"), "{}", "utf8");
    expect((await listRuns()).map((r) => r.id)).toEqual(["ok"]);
  });

  it("returns null for a missing or malformed id", async () => {
    expect(await loadRun("nope")).toBeNull();
    expect(await loadRun("../etc/passwd")).toBeNull();
  });

  it("rejects ids that could escape the data directory", async () => {
    await expect(saveRun(make("../x", "2026-09-23T10:00:00.000Z"))).rejects.toThrow(/invalid run id/);
    await expect(saveRun(make("a/b", "2026-09-23T10:00:00.000Z"))).rejects.toThrow(/invalid run id/);
  });
});
