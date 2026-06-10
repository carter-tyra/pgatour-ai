import { describe, expect, it } from "vitest";
import { isGroupActive, isItemActive } from "./helpers";
import type { SidebarGroup } from "./nav.config";

const Noop = (() => null) as unknown as SidebarGroup["icon"];

const group: SidebarGroup = {
  id: "intelligence",
  label: "Intelligence",
  icon: Noop,
  items: [
    { label: "Research", href: "/dashboard/research", icon: Noop },
    { label: "Betting", href: "/dashboard/betting", icon: Noop },
  ],
};

describe("isItemActive", () => {
  it("matches the exact path", () => {
    expect(isItemActive("/dashboard/research", "/dashboard/research")).toBe(true);
  });

  it("matches nested child paths", () => {
    expect(isItemActive("/dashboard/research/field", "/dashboard/research")).toBe(true);
  });

  it("does not match a sibling with a shared prefix", () => {
    expect(isItemActive("/dashboard/research-notes", "/dashboard/research")).toBe(false);
  });

  it("does not match unrelated paths", () => {
    expect(isItemActive("/dashboard/betting", "/dashboard/research")).toBe(false);
  });
});

describe("isGroupActive", () => {
  it("is true when any item is active", () => {
    expect(isGroupActive("/dashboard/betting", group)).toBe(true);
  });

  it("is false when no item is active", () => {
    expect(isGroupActive("/dashboard/live", group)).toBe(false);
  });
});
