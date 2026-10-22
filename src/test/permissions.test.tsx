import { describe, it, expect } from "vitest";
import { canDelete, canEdit } from "@/lib/permissions";

describe("quotation permissions", () => {
  it("only Admin can delete quotations", () => {
    expect(canDelete("Admin")).toBe(true);
    expect(canDelete("User")).toBe(false);
  });
  it("Users are view only", () => {
    expect(canEdit("User")).toBe(false);
    expect(canEdit("Admin")).toBe(true);
  });
});
