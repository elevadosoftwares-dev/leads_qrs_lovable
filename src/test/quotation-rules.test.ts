import { describe, expect, it } from "vitest";
import {
  DAILY_ACCESS_THRESHOLD,
  crossesDailyThreshold,
  dailyQuotationCount,
  manualQuotationNumber,
  matchesClientName,
} from "@/lib/quotation-rules";

describe("quotation rules", () => {
  it("uses the manually entered quotation number", () => {
    expect(manualQuotationNumber("  CUSTOM-2026/18  ")).toBe("CUSTOM-2026/18");
    expect(manualQuotationNumber(" ")).toBe("");
  });
  it("searches by client name without case sensitivity", () => {
    expect(matchesClientName("Vopak Terminals Singapore", " VOPAK ")).toBe(true);
    expect(matchesClientName("G-tech Engineering", "Vopak")).toBe(false);
  });
  it("reaches the daily threshold at exactly five quotations", () => {
    expect(DAILY_ACCESS_THRESHOLD).toBe(5);
    expect(crossesDailyThreshold(3, 4)).toBe(false);
    expect(crossesDailyThreshold(4, 5)).toBe(true);
    expect(crossesDailyThreshold(5, 6)).toBe(false);
  });
  it("counts distinct quotations per user and resets at Singapore midnight", () => {
    const user = { id: "u1", name: "Admin" };
    const logs = [
      { quotationId: "q1", user: "Admin", userId: "u1", at: "2026-10-18T15:59:00Z" },
      { quotationId: "q2", user: "Admin", userId: "u1", at: "2026-10-18T16:00:00Z" },
      { quotationId: "q2", user: "Admin", userId: "u1", at: "2026-10-18T16:01:00Z" },
      { quotationId: "q3", user: "Admin", userId: "u2", at: "2026-10-18T16:01:00Z" },
    ];
    expect(dailyQuotationCount(logs, user, "2026-10-18T15:59:59Z")).toBe(1);
    expect(dailyQuotationCount(logs, user, "2026-10-18T16:02:00Z")).toBe(1);
  });
});
