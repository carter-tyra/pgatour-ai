export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue | QueryValue[]>;
export type QueryParamUpdate = QueryValue | QueryValue[];
export type QueryParamUpdates = Record<string, QueryParamUpdate>;
export type QueryParamSource = string | URLSearchParams | { toString(): string };

export function appendQuery(path: string, params?: QueryParams) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item !== undefined && item !== null && item !== "") {
        query.append(key, String(item));
      }
    }
  }

  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export function applyQueryUpdates(
  path: string,
  source: QueryParamSource,
  updates: QueryParamUpdates,
) {
  const query = new URLSearchParams(source.toString());

  for (const [key, value] of Object.entries(updates)) {
    query.delete(key);
    const values = Array.isArray(value) ? value : [value];

    for (const item of values) {
      if (item !== undefined && item !== null && item !== "") {
        query.append(key, String(item));
      }
    }
  }

  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}
