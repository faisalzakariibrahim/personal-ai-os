import { describe, it, expect } from "vitest";
import { classifyRisk, requiresApproval, humanOnly } from "../src/lib/risk";

describe("risk classification", () => {
  it("classifies bank transfers as critical (4)", () => {
    expect(classifyRisk("Initiate a bank transfer of $200")).toBe(4);
  });
  it("classifies purchases as high (3)", () => {
    expect(classifyRisk("Purchase headphones", 89)).toBe(3);
    expect(classifyRisk("Buy a laptop")).toBe(3);
  });
  it("any action with cost is at least high", () => {
    expect(classifyRisk("Renew domain", 12)).toBe(3);
  });
  it("classifies sending email as medium (2)", () => {
    expect(classifyRisk("Send an email to the landlord")).toBe(2);
  });
  it("classifies suggestions as low (1)", () => {
    expect(classifyRisk("Recommend a restaurant")).toBe(1);
  });
  it("classifies organizing as safe (0)", () => {
    expect(classifyRisk("Organize notes into folders")).toBe(0);
  });
  it("approval gates: >=2 requires approval, 4 is human-only", () => {
    expect(requiresApproval(0)).toBe(false);
    expect(requiresApproval(1)).toBe(false);
    expect(requiresApproval(2)).toBe(true);
    expect(requiresApproval(3)).toBe(true);
    expect(humanOnly(4)).toBe(true);
    expect(humanOnly(3)).toBe(false);
  });
});
