// Tipos compartilhados entre o app (web), o futuro painel de admin e a API.
// Hoje descrevem o formato ATUAL dos JSONs (public/data/games/*.json),
// que ainda não está normalizado (fase 3 do plano de migração cuida disso).
// Por enquanto o objetivo é só dar tipagem e um único lugar de referência,
// sem mudar o formato dos dados existentes.

export type AnyBuild = {
  id: string;
  name: string;
  source?: string;
  status?: string;
  tier?: string;
  [key: string]: unknown;
};

export type GameDataFile = {
  game: string;
  id: string;
  class?: { id: string; name_pt: string; name_en: string };
  leveling_builds?: AnyBuild[];
  endgame_builds?: AnyBuild[];
  [key: string]: unknown;
};

export type GamesIndex = {
  games: { id: string; name: string; file: string }[];
};
