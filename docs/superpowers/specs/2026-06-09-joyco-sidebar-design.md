# Joyco-style Sidebar — Design Spec

**Date:** 2026-06-09
**Status:** Approved (pending spec review)
**Topic:** Replace the dashboard navigation with a joyco-hub-style two-part sidebar, built as composable, modular components.

## Goal

Recreate the [joyco studios hub](https://hub.joyco.studio/) sidebar — a slim icon rail beside a wider labeled panel (search, collapsible category sections, social footer) — as a clean, composable component system, and wire it in as the real dashboard navigation, replacing the current `AppSidebar`.

## Why not a literal port

The real joyco sidebar is tightly coupled to **Fumadocs** (`fumadocs-core/page-tree`): every section renders from a docs page-tree, with games/effects/canvas/lib slugs filtered out of one big "components" folder. This app is not a docs site. We recreate the **visual design + composable component architecture**, driven by a typed config, not a docs framework.

## Constraints (from project memory)

- **Dark mode is locked.** Do not touch `.dark` tokens in `globals.css`. Light-mode `:root` may be refined as needed.
- **No fake content.** Dashboard routes are flat (`/dashboard/research`, `/betting`, …) with no sub-pages. Do not invent sub-routes. Collapsible sections group the *real* routes.
- **Plain human labels**, font-mono uppercase styling matching the reference.

## Chosen approach — A: slim rail + labeled expandable panel

A persistent thin icon rail (brand top, one icon per group, theme toggle bottom) sits beside a wider labeled panel containing `SEARCH ⌘K` → collapsible category sections (grouping real routes) → social-links footer. Rail icons jump to / expand their group. Uses only real routes; mirrors the screenshot's two-column composition.

Rejected alternatives:
- **B (rail switches panel content):** closest to joyco's real interaction, but over-engineered for ~8 flat routes.
- **C (section-per-route with sub-views):** requires inventing sub-routes → violates the no-fake-content rule.

## Component architecture

New directory `apps/web/src/components/layout/sidebar/`. Each file has one responsibility; everything is driven by the typed config.

| File | Responsibility |
|---|---|
| `nav.config.ts` | Typed `sidebarNav`: groups → items (`label`, `href`, `icon`, optional `badge`, `dot`). Single source of truth for navigation. |
| `index.tsx` | `AppSidebar` composition root. Wires the reused `SidebarProvider` (from `ui/sidebar`) + `SidebarRail` + `SidebarPanel`. Public entry point. |
| `sidebar-rail.tsx` | Slim icon strip: brand logo (top), one icon per group, `ThemeToggle` (footer). Always visible. |
| `sidebar-panel.tsx` | Wide column: header (`SidebarSearch`), scrollable section list, `SocialLinks` (footer). |
| `sidebar-search.tsx` | Joyco-styled `SEARCH … ⌘K` trigger that opens the existing `CommandMenu`. |
| `sidebar-section.tsx` | Collapsible category: icon + uppercase mono label + `+`/`−` toggle; renders `SidebarLink` children with the left-border rail and bottom spacer. |
| `sidebar-link.tsx` | A nav row: active border/bg/font state, optional colored `dot` + `MetaBadge`. |
| `sidebar-badge.tsx` | `new` / `updated` / `internal` meta badge. Reuse `ui/badge` if it fits; otherwise a thin wrapper. |
| `social-links.tsx` | Footer social row (joyco / X / GitHub / Instagram → configured links). |

### Reuse (DRY)

- `SidebarProvider` / `useSidebar` from `components/ui/sidebar.tsx` — for open/collapsed state, mobile sheet behavior, and the keyboard shortcut. Build the custom rail/panel inside it rather than reinventing a provider.
- `CommandMenu` (`components/product/command-menu.tsx`) — the `⌘K` dialog. `SidebarSearch` renders a joyco-styled trigger that opens it. Refactor `CommandMenu` to accept a custom trigger (render-prop) if needed, keeping its default usage intact.
- `ThemeToggle` (`components/product/theme-toggle.tsx`) — placed in the rail footer.
- `@carbon/icons-react` — section/group and item icons (already the project's icon set).

### Data model

```ts
type SidebarItem = {
  label: string
  href: string
  icon: ComponentType<IconProps>
  badge?: 'new' | 'updated' | 'internal'
  dot?: 'red' | 'blue' | 'green' | 'yellow'
}

type SidebarGroup = {
  id: string
  label: string          // uppercase mono in UI
  icon: ComponentType<IconProps>
  defaultOpen?: boolean
  items: SidebarItem[]
}

const sidebarNav: SidebarGroup[]
```

Default grouping (editable — it's config):

- **INTELLIGENCE** → Research, Betting, Fantasy
- **LIVE** → Live, Portfolio
- **WORKSPACE** → Brandel (AI Analyst), Account

### Data flow

`dashboard-shell.tsx` renders `<AppSidebar>` (new). `AppSidebar` reads `sidebarNav`, renders `SidebarRail` (one icon per group) and `SidebarPanel` (sections from groups). `usePathname()` drives active state in `SidebarSection`/`SidebarLink`. Section open/closed is local component state seeded by `defaultOpen`. Mobile/collapse state comes from `useSidebar()`.

## Styling

- Font-mono, uppercase, tracking-wide labels; `+`/`−` (or `Plus`/`Minus`) toggle on the right of each section header.
- Active link: left-border accent + `bg-accent` + medium weight; inactive: muted with hover border/foreground — matching the reference's left-rail treatment.
- Uses existing `--sidebar-*` tokens. Define the missing `--aside-width` token in `globals.css` (`:root` only; **do not modify `.dark`**).
- Respect locked dark mode; refine light `:root` only where required for parity.

## Integration

- In `dashboard-shell.tsx`, replace the old `AppSidebar` import/usage with the new `components/layout/sidebar`.
- Remove the orphaned `nav-aside.tsx` (relies on undefined `--aside-width`, not mounted) and the old `app-sidebar.tsx` once the new one is wired.
- The old `AppSidebar` carried readiness/quality props (`readinessScore`, `modelQualityStatus`, etc.). Per the real-data-shape memory these are largely placeholder; the new sidebar drops them from navigation. If a readiness indicator is still wanted, it moves to the panel footer as a small status row — decided during planning. Default: drop from the sidebar, keep the data available in `dashboard-data` for the header.
- Wire the empty `search-toggle.tsx` intent into `sidebar-search.tsx` (delete the empty file).

## Error / edge handling

- Empty group → render nothing (no empty section header).
- Unknown pathname → no active item; sidebar still renders.
- Mobile → existing `Sidebar` sheet behavior; panel becomes the sheet content, rail collapses per `useSidebar`.
- Keyboard: section toggles are real `<button>`s; links are `<Link>`s; `⌘K` opens search.

## Testing

- Extend the existing Playwright smoke spec (`apps/web/e2e/smoke.spec.ts`): assert the sidebar renders, a section expands/collapses on click, and the active route gets active styling.
- Type-check + Biome lint pass for all new files.

## Out of scope

- Search results inside the panel (joyco's inline `search-results`/`no-results`) — `⌘K` command menu covers search.
- The lab/snake-game easter egg from joyco.
- New dashboard sub-routes.
