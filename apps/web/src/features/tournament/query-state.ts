"use client";

import { createParser, parseAsStringLiteral, useQueryStates } from "nuqs";
import { dashboardSectionValues, parseUuidQueryValue } from "./url-values";

const parseAsUuid = createParser({
  parse: parseUuidQueryValue,
  serialize: (value) => value,
});

export const dashboardQueryStateParsers = {
  section: parseAsStringLiteral(dashboardSectionValues).withDefault("betting"),
  tournamentId: parseAsUuid,
};

export function useDashboardQueryState() {
  return useQueryStates(dashboardQueryStateParsers, {
    clearOnDefault: true,
    history: "replace",
    shallow: false,
  });
}
