// Tipos compartilhados entre o app (web), o futuro painel de admin e a API.
// Hoje descrevem o formato ATUAL dos JSONs (public/data/games/*.json),
// que ainda não está normalizado (fase 3 do plano de migração cuida disso).
// Por enquanto o objetivo é só dar tipagem e um único lugar de referência,
// sem mudar o formato dos dados existentes.

// Schema normalizado de equipamento (fase 1 da normalização do Diablo —
// ver claude/plano-migracao-react.md). Antes cada build guardava "equipment"
// num formato ad-hoc próprio (chaves soltas "<slot>_aspect", "<slot>" pra
// Mythic Unique, texto de afixo em vez de nome de item...). Builds cujo
// guia de origem não associa itens a slots (só dá ordem de prioridade de
// craft) continuam com o formato antigo nesse campo — ver
// "equipment_shape_note" quando presente.
export type EquipmentSlotName =
  | "helm"
  | "chest"
  | "gloves"
  | "pants"
  | "boots"
  | "amulet"
  | "ring_1"
  | "ring_2"
  | "weapon";

export type EquipmentSlot = {
  slot: EquipmentSlotName;
  // "affix": a fonte só dá prioridade de afixo pro slot, sem nomear um
  // Aspect/Unique/Mythic específico (comum em builds de leveling) — nesse
  // caso "name" guarda a lista de afixos, não um nome de item.
  itemType: "aspect" | "unique" | "mythic" | "set" | "affix";
  name: string;
  note?: string;
};

export type AnyBuild = {
  id: string;
  name: string;
  source?: string;
  status?: string;
  tier?: string;
  equipment?: EquipmentSlot[] | Record<string, unknown>;
  equipment_shape_note?: string;
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
