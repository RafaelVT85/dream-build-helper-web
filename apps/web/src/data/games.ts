import type { GameDataFile } from "../../../packages/data-schema/types";

// Camada de leitura de dados. Por enquanto lê os JSONs estáticos que já
// existem em /public/data/games (mesma fonte de dados de hoje) — trocar
// por chamada de API é o próximo passo (fase 4 do plano de migração),
// sem precisar mexer nos componentes que consomem esses dados.

export async function fetchGamesIndex() {
  const res = await fetch("/data/games/index.json");
  if (!res.ok) throw new Error("Não consegui carregar a lista de jogos");
  return res.json() as Promise<{ games: { id: string; name: string; file: string }[] }>;
}

export async function fetchGame(file: string): Promise<GameDataFile> {
  const res = await fetch(`/data/games/${file}`);
  if (!res.ok) throw new Error(`Não consegui carregar os dados de ${file}`);
  return res.json();
}
