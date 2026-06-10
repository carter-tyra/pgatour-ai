import type { AppDatabase } from "@pgatour-ai/db";
import { sql } from "drizzle-orm";

export type RepairResultFieldEntriesOptions = {
  dryRun?: boolean;
  fromSeason: number;
  toSeason: number;
};

export type RepairResultFieldEntriesSummary = {
  candidateRows: number;
  dryRun: boolean;
  fieldEntriesMissingBefore: number;
  fieldEntriesUnknownBefore: number;
  fieldEntriesUpserted: number;
  fromSeason: number;
  mappingsUpserted: number;
  toSeason: number;
};

type CountRow = {
  candidate_rows: number | string;
  field_entries_missing_before: number | string;
  field_entries_unknown_before: number | string;
};

type UpsertRow = {
  field_entries_upserted: number | string;
  mappings_upserted: number | string;
};

function numberValue(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function firstRow<TRow extends Record<string, unknown>>(result: unknown): TRow | undefined {
  if (Array.isArray(result)) {
    return result[0] as TRow | undefined;
  }

  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;

    return Array.isArray(rows) ? (rows[0] as TRow | undefined) : undefined;
  }

  return undefined;
}

function resultFieldEntryCandidatesSql(fromSeason: number, toSeason: number) {
  return sql`
    select
      tr.tournament_id,
      tr.player_id,
      'result:' || tournament_map.source_entity_id || ':' || player_map.source_entity_id
        as source_entity_id,
      jsonb_build_object(
        'balldontlie',
        'result:' || tournament_map.source_entity_id || ':' || player_map.source_entity_id
      ) as source_ids
    from tournament_results tr
    inner join tournaments t on t.id = tr.tournament_id
    inner join source_entity_mappings tournament_map
      on tournament_map.source = 'balldontlie'
     and tournament_map.entity_type = 'tournament'
     and tournament_map.canonical_id = tr.tournament_id
    inner join source_entity_mappings player_map
      on player_map.source = 'balldontlie'
     and player_map.entity_type = 'player'
     and player_map.canonical_id = tr.player_id
    where tr.source = 'balldontlie'
      and t.status = 'completed'
      and t.season between ${fromSeason} and ${toSeason}
  `;
}

async function countResultFieldEntryCandidates(
  db: AppDatabase,
  options: RepairResultFieldEntriesOptions,
) {
  const result = await db.execute(sql`
    with candidates as (${resultFieldEntryCandidatesSql(options.fromSeason, options.toSeason)})
    select
      count(*)::int as candidate_rows,
      count(*) filter (where fe.id is null)::int as field_entries_missing_before,
      count(*) filter (where fe.id is not null and fe.status = 'unknown')::int
        as field_entries_unknown_before
    from candidates c
    left join field_entries fe
      on fe.tournament_id = c.tournament_id
     and fe.player_id = c.player_id
  `);
  const row = firstRow<CountRow>(result);

  return {
    candidateRows: numberValue(row?.candidate_rows),
    fieldEntriesMissingBefore: numberValue(row?.field_entries_missing_before),
    fieldEntriesUnknownBefore: numberValue(row?.field_entries_unknown_before),
  };
}

async function upsertResultFieldEntryCandidates(
  db: AppDatabase,
  options: RepairResultFieldEntriesOptions,
) {
  const result = await db.execute(sql`
    with candidates as (${resultFieldEntryCandidatesSql(options.fromSeason, options.toSeason)}),
    upserted_field_entries as (
      insert into field_entries (
        tournament_id,
        player_id,
        status,
        seed,
        tee_wave,
        source_ids
      )
      select
        tournament_id,
        player_id,
        'entered',
        null,
        null,
        source_ids
      from candidates
      on conflict (tournament_id, player_id) do update set
        seed = coalesce(field_entries.seed, excluded.seed),
        source_ids = excluded.source_ids || field_entries.source_ids,
        status = case
          when field_entries.status = 'unknown' then excluded.status
          else field_entries.status
        end,
        tee_wave = coalesce(field_entries.tee_wave, excluded.tee_wave),
        updated_at = now()
      returning id, tournament_id, player_id
    ),
    upserted_mappings as (
      insert into source_entity_mappings (
        source,
        entity_type,
        source_entity_id,
        canonical_id
      )
      select
        'balldontlie',
        'field_entry',
        c.source_entity_id,
        fe.id
      from candidates c
      inner join upserted_field_entries fe
        on fe.tournament_id = c.tournament_id
       and fe.player_id = c.player_id
      on conflict (source, entity_type, source_entity_id) do update set
        canonical_id = excluded.canonical_id,
        updated_at = now()
      returning id
    )
    select
      (select count(*)::int from upserted_field_entries) as field_entries_upserted,
      (select count(*)::int from upserted_mappings) as mappings_upserted
  `);
  const row = firstRow<UpsertRow>(result);

  return {
    fieldEntriesUpserted: numberValue(row?.field_entries_upserted),
    mappingsUpserted: numberValue(row?.mappings_upserted),
  };
}

export async function repairResultFieldEntries(
  db: AppDatabase,
  options: RepairResultFieldEntriesOptions,
): Promise<RepairResultFieldEntriesSummary> {
  if (!Number.isInteger(options.fromSeason) || options.fromSeason <= 0) {
    throw new Error("fromSeason must be a positive integer");
  }

  if (!Number.isInteger(options.toSeason) || options.toSeason <= 0) {
    throw new Error("toSeason must be a positive integer");
  }

  if (options.fromSeason > options.toSeason) {
    throw new Error("fromSeason must be less than or equal to toSeason");
  }

  const counts = await countResultFieldEntryCandidates(db, options);
  const upserted = options.dryRun
    ? { fieldEntriesUpserted: 0, mappingsUpserted: 0 }
    : await upsertResultFieldEntryCandidates(db, options);

  return {
    ...counts,
    ...upserted,
    dryRun: Boolean(options.dryRun),
    fromSeason: options.fromSeason,
    toSeason: options.toSeason,
  };
}
