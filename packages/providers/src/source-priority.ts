import type { DataSource } from "@pgatour-ai/domain";

export const sourcePriority = {
  modelingInputs: ["datagolf", "sportsdataio", "manual"] satisfies DataSource[],
  liveScoring: ["sportsdataio", "datagolf", "manual"] satisfies DataSource[],
  liveOdds: ["datagolf", "the-odds-api", "sportsdataio", "manual"] satisfies DataSource[],
  playerMetadata: ["sportsdataio", "datagolf", "manual"] satisfies DataSource[],
  news: ["sportsdataio", "manual"] satisfies DataSource[],
};
