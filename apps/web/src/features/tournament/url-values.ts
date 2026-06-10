export const dashboardSectionValues = [
  "ai",
  "betting",
  "fantasy",
  "live",
  "portfolio",
  "research",
] as const;

export type DashboardSection = (typeof dashboardSectionValues)[number];

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function parseUuidQueryValue(value: string) {
  return uuidPattern.test(value) ? value : null;
}
