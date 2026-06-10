import {
  createParser,
  createSearchParamsCache,
  createSerializer,
  type inferParserType,
  parseAsStringLiteral,
} from "nuqs/server";
import { dashboardSectionValues, parseUuidQueryValue } from "./url-values";

const parseAsUuid = createParser({
  parse: parseUuidQueryValue,
  serialize: (value) => value,
});

export const dashboardSearchParams = {
  section: parseAsStringLiteral(dashboardSectionValues).withDefault("betting"),
  tournamentId: parseAsUuid,
};

export const dashboardSearchParamsCache = createSearchParamsCache(dashboardSearchParams);
export const createDashboardUrl = createSerializer(dashboardSearchParams);

export type DashboardSearchParams = inferParserType<typeof dashboardSearchParams>;
