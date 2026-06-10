import { describe, expect, it } from "vitest";
import { summarizeSyncRunError } from "./data-status";

describe("data status CLI helpers", () => {
  it("keeps sync run error output bounded", () => {
    const summary = summarizeSyncRunError("x".repeat(550));

    expect(summary).toMatchObject({
      length: 550,
      truncated: true,
    });
    expect(summary?.preview).toHaveLength(503);
  });

  it("keeps empty sync run errors as null", () => {
    expect(summarizeSyncRunError(null)).toBeNull();
  });
});
