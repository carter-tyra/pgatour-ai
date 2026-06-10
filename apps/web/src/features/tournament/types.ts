import type {
  CanonicalFieldPlayer,
  LatestSyncRun,
  SourceFreshness,
} from "@/lib/intelligence-types";

export type CanonicalTournament = {
  courseName: string;
  endsOn: string;
  id: string;
  name: string;
  season: number;
  startsOn: string;
  status: string;
};

export type TournamentSnapshot = {
  fieldPlayers: CanonicalFieldPlayer[];
  freshness: SourceFreshness[];
  latestSyncRun: LatestSyncRun | null;
  tournament: CanonicalTournament | null;
};
