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

// Schema do Shape of Dreams (e qualquer jogo futuro que siga o mesmo molde:
// personagens com builds próprias, cada build com "memories" — skills — e
// cada memory com uma lista de "essences" — itens). Bem diferente do schema
// leveling_builds/endgame_builds do Diablo, então tem seu próprio tipo e sua
// própria tela (ver ShapeBuildView.tsx / trecho isShapeGame em GameDetail).

export type ShapeEssence = {
  key?: string;
  name: string;
  type?: string;
  rarity?: string;
  icon?: string;
  effect?: string;
  note?: string;
  [key: string]: unknown;
};

export type ShapeMemory = {
  key?: string;
  name: string;
  type?: string;
  icon?: string;
  effect?: string;
  essences?: ShapeEssence[];
  [key: string]: unknown;
};

export type ShapeConstellationStar = {
  key?: string;
  name: string;
  category?: string;
  effect?: string;
  icon?: string;
  [key: string]: unknown;
};

export type ShapeBuild = {
  id: string;
  name: string;
  tag?: string;
  likes?: number;
  views?: number;
  season?: string;
  date?: string;
  notes?: string;
  memories?: ShapeMemory[];
  [key: string]: unknown;
};

export type ShapeTraveler = {
  id: string;
  name: string;
  role?: string;
  icon?: string;
  builds?: ShapeBuild[];
  constellation?: ShapeConstellationStar[];
  _constellation_note?: string;
  [key: string]: unknown;
};

export type ShapeGameDataFile = GameDataFile & {
  travelers: ShapeTraveler[];
};

export function isShapeGame(data: GameDataFile): data is ShapeGameDataFile {
  return Array.isArray((data as { travelers?: unknown }).travelers);
}
