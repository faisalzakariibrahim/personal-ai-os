import { describe, it, expect } from "vitest";
import { permissionMatches } from "../src/lib/permissions";

describe("permission matching", () => {
  it("exact match", () => {
    expect(permissionMatches("action.recommend", "action.recommend")).toBe(true);
  });
  it("scoped match", () => {
    expect(permissionMatches("memory.read:finance", "memory.read:finance")).toBe(true);
    expect(permissionMatches("memory.read:finance", "memory.read:health")).toBe(false);
  });
  it("wildcard scope", () => {
    expect(permissionMatches("memory.read:*", "memory.read:health")).toBe(true);
    expect(permissionMatches("memory.write:*", "memory.read:health")).toBe(false);
  });
  it("memory isolation: finance agent cannot read health", () => {
    const financePerms = ["memory.read:finance", "memory.write:finance", "action.recommend"];
    const wantsHealth = financePerms.some((p) => permissionMatches(p, "memory.read:health"));
    expect(wantsHealth).toBe(false);
  });
});
