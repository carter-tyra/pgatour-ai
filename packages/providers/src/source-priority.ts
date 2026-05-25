import type { DataSource } from "@pgatour-ai/domain";

export const sourcePriority = {
  modelingInputs: ["datagolf", "balldontlie", "sportsdataio", "manual"] satisfies DataSource[],
  liveScoring: ["sportsdataio", "balldontlie", "datagolf", "manual"] satisfies DataSource[],
  liveOdds: [
    "datagolf",
    "balldontlie",
    "the-odds-api",
    "sportsdataio",
    "manual",
  ] satisfies DataSource[],
  playerMetadata: ["balldontlie", "sportsdataio", "datagolf", "manual"] satisfies DataSource[],
  news: ["sportsdataio", "manual"] satisfies DataSource[],
};
