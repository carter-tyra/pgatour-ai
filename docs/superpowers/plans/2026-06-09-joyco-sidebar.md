# Joyco-style Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard navigation with a composable, joyco-hub-style two-part sidebar — a slim icon rail beside a labeled panel (search, collapsible sections, social footer) — driven by a typed config.

**Architecture:** A new `components/layout/sidebar/` module of small single-responsibility components, all rendering from one typed `sidebarNav` config. Pure active-state logic lives in a separate `helpers.ts` (unit-tested with vitest). The module reuses the existing `SidebarProvider`/`useSidebar` (state + mobile sheet), `CommandMenu` (⌘K search), `ThemeToggle`, and `@carbon/icons-react`. It is wired into `dashboard-shell.tsx`, retiring the old `app-sidebar.tsx`, the orphaned `nav-aside.tsx`, and the empty `search-toggle.tsx`.

**Tech Stack:** Next.js (App Router) + React, Tailwind v4 (`--sidebar-*` tokens), base-ui sidebar primitives (`components/ui/sidebar.tsx`), `@carbon/icons-react`, vitest (node env).

**Spec:** `docs/superpowers/specs/2026-06-09-joyco-sidebar-design.md`

---

## Test strategy (read first)

- vitest runs in a **node** environment — no React rendering. Genuine TDD targets the pure functions in `helpers.ts`.
- All React component tasks are gated by `pnpm --dir apps/web typecheck` (expected: exits 0, no errors). This is the objective pass/fail signal for those tasks.
- `/dashboard` is auth-gated with no e2e fixture, so Playwright e2e is out of scope. The final task is a manual dev-server review after logging in.
- Run all commands from the repo root: `/Users/cartertyra/Documents/pgatour-ai`.

## Naming note

`components/ui/sidebar.tsx` already exports a `SidebarRail`. To avoid collision, our rail component is named **`IconRail`** (file `icon-rail.tsx`).

## File structure

Create under `apps/web/src/components/layout/sidebar/`:

| File | Export | Responsibility |
|---|---|---|
| `nav.config.ts` | `sidebarNav`, `socialLinks`, types | Typed nav data (groups → items) + social links. Single source of truth. |
| `helpers.ts` | `isItemActive`, `isGroupActive` | Pure active-state logic. Unit-tested. |
| `helpers.test.ts` | — | vitest unit tests for helpers. |
| `sidebar-badge.tsx` | `SidebarBadge` | `new`/`updated`/`internal` meta badge (wraps `ui/badge`). |
| `sidebar-link.tsx` | `SidebarLink` | One nav row: active rail/bg, optional dot + badge. |
| `sidebar-section.tsx` | `SidebarSection` | Collapsible category: icon + mono label + Add/Subtract toggle. |
| `sidebar-search.tsx` | `SidebarSearch` | Joyco-styled `SEARCH ⌘K` trigger opening `CommandMenu`. |
| `social-links.tsx` | `SocialLinks` | Footer social icon row. |
| `icon-rail.tsx` | `IconRail` | Slim rail: brand, group icons, theme toggle. |
| `sidebar-panel.tsx` | `SidebarPanel` | Wide column: search header, sections, social footer. |
| `index.tsx` | `AppSidebar` | Composition root rendered by the shell. |

Modify: `apps/web/src/app/globals.css` (token), `apps/web/src/components/product/command-menu.tsx` (custom trigger prop), `apps/web/src/components/layout/dashboard-shell.tsx` (integration).

Delete: `apps/web/src/components/layout/app-sidebar.tsx`, `apps/web/src/components/layout/nav-aside.tsx`, `apps/web/src/components/layout/search-toggle.tsx`.

---

## Task 1: Define the `--aside-width` token

**Files:**
- Modify: `apps/web/src/app/globals.css` (the light-mode `:root` block, near other layout tokens around line 281)

`--spacing-aside-width: var(--aside-width)` already exists but `--aside-width` itself is never defined. Add it to `:root` only. **Do not touch the `.dark` block.**

- [ ] **Step 1: Add the token to `:root`**

Find the `:root { ... }` block (the light-mode one, contains `--radius: 0.625rem;` near line 11). Add these two lines inside it:

```css
  --aside-width: 3.5rem;
  --sidebar-panel-width: 17rem;
```

- [ ] **Step 2: Verify build still compiles**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat(sidebar): define --aside-width and --sidebar-panel-width tokens"
```

---

## Task 2: Nav config + types

**Files:**
- Create: `apps/web/src/components/layout/sidebar/nav.config.ts`

- [ ] **Step 1: Write the config**

```ts
import {
  Activity,
  Analytics,
  Application,
  Bot,
  CurrencyDollar,
  type IconProps,
  LogoGithub,
  LogoInstagram,
  LogoX,
  Radio,
  Search,
  Trophy,
  UserAvatar,
  Wallet,
} from "@carbon/icons-react";

export type SidebarDot = "red" | "blue" | "green" | "yellow";
export type SidebarBadgeType = "new" | "updated" | "internal";

export type SidebarItem = {
  label: string;
  href: string;
  icon: React.ComponentType<IconProps>;
  badge?: SidebarBadgeType;
  dot?: SidebarDot;
};

export type SidebarGroup = {
  id: string;
  label: string;
  icon: React.ComponentType<IconProps>;
  defaultOpen?: boolean;
  items: SidebarItem[];
};

export const brand = {
  label: "PGA Tour AI",
  href: "/dashboard/betting",
  icon: Activity as React.ComponentType<IconProps>,
};

export const sidebarNav: SidebarGroup[] = [
  {
    id: "intelligence",
    label: "Intelligence",
    icon: Analytics as React.ComponentType<IconProps>,
    defaultOpen: true,
    items: [
      { label: "Research", href: "/dashboard/research", icon: Search as React.ComponentType<IconProps> },
      { label: "Betting", href: "/dashboard/betting", icon: CurrencyDollar as React.ComponentType<IconProps> },
      { label: "Fantasy", href: "/dashboard/fantasy", icon: Trophy as React.ComponentType<IconProps> },
    ],
  },
  {
    id: "live",
    label: "Live",
    icon: Radio as React.ComponentType<IconProps>,
    defaultOpen: true,
    items: [
      { label: "Live", href: "/dashboard/live", icon: Radio as React.ComponentType<IconProps> },
      { label: "Portfolio", href: "/dashboard/portfolio", icon: Wallet as React.ComponentType<IconProps> },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    icon: Application as React.ComponentType<IconProps>,
    defaultOpen: true,
    items: [
      { label: "Brandel", href: "/dashboard/brandel", icon: Bot as React.ComponentType<IconProps> },
      { label: "Account", href: "/dashboard/account", icon: UserAvatar as React.ComponentType<IconProps> },
    ],
  },
];

export type SocialLink = {
  label: string;
  href: string;
  icon: React.ComponentType<IconProps>;
};

// Placeholder URLs — swap in real handles when available.
export const socialLinks: SocialLink[] = [
  { label: "Home", href: "/dashboard", icon: Activity as React.ComponentType<IconProps> },
  { label: "X", href: "#", icon: LogoX as React.ComponentType<IconProps> },
  { label: "GitHub", href: "#", icon: LogoGithub as React.ComponentType<IconProps> },
  { label: "Instagram", href: "#", icon: LogoInstagram as React.ComponentType<IconProps> },
];
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0. If any carbon icon name is unresolved (e.g. `Analytics`, `Application`, `UserAvatar`, `LogoX`), open `node_modules/@carbon/icons-react` and pick the nearest existing export, then re-run. (These names exist in current `@carbon/icons-react`.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/sidebar/nav.config.ts
git commit -m "feat(sidebar): add typed nav + social config"
```

---

## Task 3: Pure active-state helpers (TDD)

**Files:**
- Create: `apps/web/src/components/layout/sidebar/helpers.ts`
- Test: `apps/web/src/components/layout/sidebar/helpers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/web exec vitest run src/components/layout/sidebar/helpers.test.ts`
Expected: FAIL — cannot resolve `./helpers`.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { SidebarGroup } from "./nav.config";

export function isItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isGroupActive(pathname: string, group: SidebarGroup): boolean {
  return group.items.some((item) => isItemActive(pathname, item.href));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir apps/web exec vitest run src/components/layout/sidebar/helpers.test.ts`
Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/sidebar/helpers.ts apps/web/src/components/layout/sidebar/helpers.test.ts
git commit -m "feat(sidebar): add active-state helpers with tests"
```

---

## Task 4: SidebarBadge

**Files:**
- Create: `apps/web/src/components/layout/sidebar/sidebar-badge.tsx`

- [ ] **Step 1: Implement**

```tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SidebarBadgeType } from "./nav.config";

const LABELS: Record<SidebarBadgeType, string> = {
  new: "NEW",
  updated: "UPD",
  internal: "INT",
};

export function SidebarBadge({ type, className }: { type: SidebarBadgeType; className?: string }) {
  return (
    <Badge
      variant={type === "internal" ? "outline" : "secondary"}
      className={cn("h-4 px-1.5 font-mono text-[10px] tracking-wide", className)}
    >
      {LABELS[type]}
    </Badge>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/sidebar/sidebar-badge.tsx
git commit -m "feat(sidebar): add SidebarBadge"
```

---

## Task 5: SidebarLink

**Files:**
- Create: `apps/web/src/components/layout/sidebar/sidebar-link.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isItemActive } from "./helpers";
import type { SidebarItem } from "./nav.config";
import { SidebarBadge } from "./sidebar-badge";

const DOT_CLASS = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-500",
} as const;

export function SidebarLink({ item, onNavigate }: { item: SidebarItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isItemActive(pathname ?? "", item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "-ml-[2px] flex items-center gap-2 border-l-2 py-1.5 pr-4 pl-4 font-mono text-sm tracking-wide uppercase transition-colors",
        active
          ? "border-primary bg-sidebar-accent/60 font-medium text-sidebar-foreground"
          : "border-transparent text-sidebar-foreground/60 hover:border-sidebar-foreground/40 hover:text-sidebar-foreground",
      )}
    >
      {item.dot && <span className={cn("size-2 shrink-0 rounded-full", DOT_CLASS[item.dot])} />}
      <item.icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{item.label}</span>
      {item.badge && <SidebarBadge type={item.badge} className="ml-auto" />}
    </Link>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/sidebar/sidebar-link.tsx
git commit -m "feat(sidebar): add SidebarLink"
```

---

## Task 6: SidebarSection

**Files:**
- Create: `apps/web/src/components/layout/sidebar/sidebar-section.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import { Add, Subtract } from "@carbon/icons-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isGroupActive } from "./helpers";
import type { SidebarGroup } from "./nav.config";
import { SidebarLink } from "./sidebar-link";

export function SidebarSection({
  group,
  onNavigate,
}: {
  group: SidebarGroup;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(group.defaultOpen ?? true);
  const pathname = usePathname();
  const active = isGroupActive(pathname ?? "", group);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          "flex min-h-(--aside-width) items-center gap-2 px-4 py-5 text-left transition-colors hover:bg-sidebar-accent",
          active && "text-sidebar-foreground/80",
        )}
      >
        <group.icon className="size-4" aria-hidden="true" />
        <span className="font-mono text-sm font-medium tracking-wide uppercase">{group.label}</span>
        <span className="ml-auto text-sidebar-foreground/50">
          {open ? <Subtract className="size-3" /> : <Add className="size-3" />}
        </span>
      </button>

      {open && (
        <>
          <div className="ml-4 flex flex-col border-sidebar-border border-l-2">
            {group.items.map((item) => (
              <SidebarLink key={item.href} item={item} onNavigate={onNavigate} />
            ))}
          </div>
          <div className="ml-4 h-3 border-sidebar-border border-l-2" />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0. (If `Add`/`Subtract` are unresolved, substitute `Plus`/`Minus` equivalents from carbon — but `Add`/`Subtract` exist.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/sidebar/sidebar-section.tsx
git commit -m "feat(sidebar): add collapsible SidebarSection"
```

---

## Task 7: Make CommandMenu accept a custom trigger

**Files:**
- Modify: `apps/web/src/components/product/command-menu.tsx`

Add an optional `trigger` prop so the sidebar can supply its own styled trigger while the default (used in the header) is unchanged.

- [ ] **Step 1: Update the component signature and trigger**

Replace the `export function CommandMenu() {` line and the `<DialogTrigger ...>...</DialogTrigger>` block.

Change the signature to:

```tsx
export function CommandMenu({ trigger }: { trigger?: React.ReactElement } = {}) {
```

Replace the existing `<DialogTrigger render={ ... }> ... </DialogTrigger>` block with:

```tsx
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger
          render={
            <Button
              variant="outline"
              className="hidden h-10 w-full min-w-lg justify-start gap-2 rounded-md bg-toolbar px-3 text-muted-foreground/80 md:flex"
            />
          }
        >
          <Search size={16} data-icon="inline-start" className="text-muted-foreground/50" />
          Search
        </DialogTrigger>
      )}
```

- [ ] **Step 2: Verify type-check and existing usage still compiles**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0. (Existing `<CommandMenu />` call sites need no change because the prop is optional.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/product/command-menu.tsx
git commit -m "feat(command-menu): support custom trigger element"
```

---

## Task 8: SidebarSearch

**Files:**
- Create: `apps/web/src/components/layout/sidebar/sidebar-search.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import { Search } from "@carbon/icons-react";
import { CommandMenu } from "@/components/product/command-menu";
import { Kbd } from "@/components/ui/kbd";

export function SidebarSearch() {
  return (
    <CommandMenu
      trigger={
        <button
          type="button"
          className="flex h-(--aside-width) w-full items-center gap-3 px-4 text-left font-mono text-sm tracking-wide text-sidebar-foreground/60 uppercase transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">Search</span>
          <Kbd className="ml-auto">⌘K</Kbd>
        </button>
      }
    />
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0. (If `@/components/ui/kbd` does not export `Kbd`, open `apps/web/src/components/ui/kbd.tsx` and use its actual export name; the file exists.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/sidebar/sidebar-search.tsx
git commit -m "feat(sidebar): add SidebarSearch trigger"
```

---

## Task 9: SocialLinks

**Files:**
- Create: `apps/web/src/components/layout/sidebar/social-links.tsx`

- [ ] **Step 1: Implement**

```tsx
import Link from "next/link";
import { cn } from "@/lib/utils";
import { socialLinks } from "./nav.config";

export function SocialLinks({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-4 border-sidebar-border border-t", className)}>
      {socialLinks.map((link) => {
        const external = link.href.startsWith("http") || link.href === "#";
        return (
          <Link
            key={link.label}
            href={link.href}
            aria-label={link.label}
            target={external && link.href !== "#" ? "_blank" : undefined}
            rel={external && link.href !== "#" ? "noreferrer" : undefined}
            className="flex h-(--aside-width) items-center justify-center text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <link.icon className="size-4" aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/sidebar/social-links.tsx
git commit -m "feat(sidebar): add SocialLinks footer"
```

---

## Task 10: IconRail

**Files:**
- Create: `apps/web/src/components/layout/sidebar/icon-rail.tsx`

The slim left strip: brand square (top), one icon per group (jumps to the group's first item), `ThemeToggle` (bottom).

- [ ] **Step 1: Implement**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/product/theme-toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isGroupActive } from "./helpers";
import { brand, sidebarNav } from "./nav.config";

export function IconRail({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex w-(--aside-width) shrink-0 flex-col border-sidebar-border border-r">
      <Link
        href={brand.href}
        aria-label={brand.label}
        className="flex size-(--aside-width) items-center justify-center bg-primary text-primary-foreground"
      >
        <brand.icon className="size-5" aria-hidden="true" />
      </Link>

      <div className="flex flex-1 flex-col">
        {sidebarNav.map((group) => {
          const active = isGroupActive(pathname ?? "", group);
          const href = group.items[0]?.href ?? brand.href;
          return (
            <Tooltip key={group.id}>
              <TooltipTrigger
                render={
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-label={group.label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex size-(--aside-width) items-center justify-center transition-colors hover:bg-sidebar-accent",
                      active
                        ? "text-sidebar-foreground"
                        : "text-sidebar-foreground/50 hover:text-sidebar-foreground",
                    )}
                  />
                }
              >
                <group.icon className="size-5" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {group.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <div className="grid place-items-center border-sidebar-border border-t py-3">
        <ThemeToggle />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/sidebar/icon-rail.tsx
git commit -m "feat(sidebar): add IconRail"
```

---

## Task 11: SidebarPanel

**Files:**
- Create: `apps/web/src/components/layout/sidebar/sidebar-panel.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import { cn } from "@/lib/utils";
import { sidebarNav } from "./nav.config";
import { SidebarSearch } from "./sidebar-search";
import { SidebarSection } from "./sidebar-section";
import { SocialLinks } from "./social-links";

export function SidebarPanel({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className={cn("flex w-(--sidebar-panel-width) min-w-0 flex-1 flex-col bg-sidebar")}>
      <div className="border-sidebar-border border-b">
        <SidebarSearch />
      </div>

      <nav className="no-scrollbar flex-1 divide-y divide-sidebar-border overflow-y-auto">
        {sidebarNav.map((group) => (
          <SidebarSection key={group.id} group={group} onNavigate={onNavigate} />
        ))}
      </nav>

      <SocialLinks />
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/sidebar/sidebar-panel.tsx
git commit -m "feat(sidebar): add SidebarPanel"
```

---

## Task 12: AppSidebar composition root

**Files:**
- Create: `apps/web/src/components/layout/sidebar/index.tsx`

Reuse the existing `Sidebar` shell (for desktop placement + mobile Sheet) but render our two-column content. `useSidebar` closes the mobile sheet on navigation.

- [ ] **Step 1: Implement**

```tsx
"use client";

import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { IconRail } from "./icon-rail";
import { SidebarPanel } from "./sidebar-panel";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { isMobile, setOpenMobile } = useSidebar();

  function handleNavigate() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarContent className="flex-row p-0">
        <IconRail onNavigate={handleNavigate} />
        <SidebarPanel onNavigate={handleNavigate} />
      </SidebarContent>
    </Sidebar>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/sidebar/index.tsx
git commit -m "feat(sidebar): add AppSidebar composition root"
```

---

## Task 13: Wire into the shell and set the width

**Files:**
- Modify: `apps/web/src/components/layout/dashboard-shell.tsx`

Swap the old `AppSidebar` for the new module and widen the sidebar to fit rail + panel. The old `AppSidebar` props (readiness/quality) are dropped from the sidebar per the spec; `shell` is still passed for the header elsewhere.

- [ ] **Step 1: Replace the import**

Change:

```tsx
import { AppSidebar } from "@/components/layout/app-sidebar";
```

to:

```tsx
import { AppSidebar } from "@/components/layout/sidebar";
```

- [ ] **Step 2: Replace the `<AppSidebar ... />` usage**

Replace the entire `<AppSidebar ... variant="inset" />` element with:

```tsx
      <AppSidebar variant="inset" />
```

- [ ] **Step 3: Set the sidebar width on the provider**

Change the `<SidebarProvider defaultOpen={false}>` opening tag to:

```tsx
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": "calc(var(--aside-width) + var(--sidebar-panel-width))",
        } as React.CSSProperties
      }
    >
```

- [ ] **Step 4: Verify type-check**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0. (The unused `shell` destructured fields that fed the old sidebar may now be unused — if typecheck/biome flags unused vars, keep `shell` passed to `Header` if it uses it; otherwise remove only the now-unused references. Do not remove `shell` from the component signature.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/dashboard-shell.tsx
git commit -m "feat(sidebar): wire new AppSidebar into dashboard shell"
```

---

## Task 14: Remove retired files

**Files:**
- Delete: `apps/web/src/components/layout/app-sidebar.tsx`
- Delete: `apps/web/src/components/layout/nav-aside.tsx`
- Delete: `apps/web/src/components/layout/search-toggle.tsx`

- [ ] **Step 1: Confirm no remaining importers**

Run: `rg -n "layout/app-sidebar|layout/nav-aside|layout/search-toggle|NavAside|AsideButton" apps/web/src`
Expected: no matches (other than the files themselves). If `appSections` from the old `app-sidebar.tsx` is imported elsewhere, move that export into `nav.config.ts` first and update the importer, then re-run.

- [ ] **Step 2: Delete the files**

```bash
git rm apps/web/src/components/layout/app-sidebar.tsx apps/web/src/components/layout/nav-aside.tsx apps/web/src/components/layout/search-toggle.tsx
```

- [ ] **Step 3: Verify type-check passes after removal**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(sidebar): remove retired sidebar/nav files"
```

---

## Task 15: Full verification + manual review

**Files:** none (verification only)

- [ ] **Step 1: Run the unit test suite**

Run: `pnpm --dir apps/web test`
Expected: all tests pass, including `helpers.test.ts`.

- [ ] **Step 2: Lint**

Run: `pnpm exec biome check apps/web/src/components/layout/sidebar apps/web/src/components/layout/dashboard-shell.tsx apps/web/src/components/product/command-menu.tsx`
Expected: no errors. Fix any reported issues and re-run.

- [ ] **Step 3: Type-check the whole app**

Run: `pnpm --dir apps/web typecheck`
Expected: exits 0.

- [ ] **Step 4: Manual dev review**

Run: `pnpm --dir apps/web dev`
Then in a browser: log in, open `/dashboard/research`. Verify:
- Slim icon rail on the left with brand square, three group icons, theme toggle at the bottom.
- Panel with `SEARCH … ⌘K` (opens the command menu), three collapsible sections (Intelligence / Live / Workspace) with Add/Subtract toggles.
- Active route shows the left-border accent + medium weight; clicking a section header expands/collapses it.
- Social row at the panel bottom.
- Toggle dark mode — the locked dark tokens render correctly; light mode is legible.
- Narrow the viewport (<768px): the sidebar collapses to the mobile sheet; selecting an item closes it.

- [ ] **Step 5: Final commit (if any review fixes were made)**

```bash
git add -A
git commit -m "fix(sidebar): polish after manual review"
```

---

## Self-review checklist (completed during authoring)

- **Spec coverage:** rail → Task 10; search → Tasks 7–8; collapsible sections → Task 6; link dot/badge → Tasks 4–5; social footer → Task 9; config-driven data → Task 2; helpers → Task 3; `--aside-width` token → Task 1; integration + retiring old files → Tasks 13–14; dark-mode untouched (Task 1 edits `:root` only); no fabricated routes (config uses existing routes only). ✓
- **Placeholders:** none — every code step contains full code; social URLs are intentionally `#` per the approved "configurable placeholders" decision. ✓
- **Type consistency:** `SidebarItem`/`SidebarGroup`/`SidebarBadgeType`/`SidebarDot` defined in Task 2 and consumed unchanged in Tasks 4–6, 10–11; `isItemActive`/`isGroupActive` signatures match between Task 3 and consumers; `CommandMenu` `trigger` prop (Task 7) matches `SidebarSearch` usage (Task 8). ✓
