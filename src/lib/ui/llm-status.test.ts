import { describe, expect, it } from "vitest";
import { llmStatus } from "./llm-status";

const usage = (calls: number, tokens: number) => ({ calls, tokens, costUsd: 0, durationMs: 0 });

describe("llmStatus", () => {
  it("detects no key, failed calls and live runs", () => {
    expect(llmStatus({ llmEnabled: false, usage: usage(0, 0) })).toBe("off");
    expect(llmStatus({ llmEnabled: true, usage: usage(9, 0) })).toBe("failed");
    expect(llmStatus({ llmEnabled: true, usage: usage(9, 20365) })).toBe("live");
  });
});
