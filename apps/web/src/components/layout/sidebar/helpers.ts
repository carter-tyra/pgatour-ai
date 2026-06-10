import type { SidebarGroup } from "./nav.config";

export function isItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isGroupActive(pathname: string, group: SidebarGroup): boolean {
  return group.items.some((item) => isItemActive(pathname, item.href));
}
