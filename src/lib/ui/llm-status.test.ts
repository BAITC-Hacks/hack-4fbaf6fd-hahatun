import { describe, expect, it } from "vitest";
import { llmStatus } from "./llm-status";

const usage = (calls: number, tokens: number, failedCalls?: number) => ({ calls, tokens, costUsd: 0, durationMs: 0, failedCalls });

describe("llmStatus", () => {
  it("off when there is no key", () => {
    expect(llmStatus({ llmEnabled: false, usage: usage(0, 0) })).toBe("off");
  });
  it("failed when every call threw, also for legacy runs without failedCalls", () => {
    expect(llmStatus({ llmEnabled: true, usage: usage(9, 0, 9) })).toBe("failed");
    expect(llmStatus({ llmEnabled: true, usage: usage(9, 0) })).toBe("failed");
  });
  it("partial when some calls threw even though tokens came back", () => {
    expect(llmStatus({ llmEnabled: true, usage: usage(9, 1200, 6) })).toBe("partial");
  });
  it("live when all calls answered", () => {
    expect(llmStatus({ llmEnabled: true, usage: usage(9, 20365, 0) })).toBe("live");
    expect(llmStatus({ llmEnabled: true, usage: usage(9, 20365) })).toBe("live");
  });
});
