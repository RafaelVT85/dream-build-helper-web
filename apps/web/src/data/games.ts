import type { GameDataFile } from "../../../../packages/data-schema/types";
import { applyBuildOverride, loadBuildOverrides } from "../lib/build-overrides";

// Camada de leitura de dados. Lê os JSONs estáticos que já existem em
// /public/data/games (mesma fonte de dados de hoje) e aplica por cima
// qualquer edição feita no painel de admin (salva via /api/save-build,
// armazenada no Vercel Blob) — o JSON estático nunca é alterado, os
// overrides só sobrepõem os campos editados na hora de exibir.

export async function fetchGamesIndex() {
  const res = await fetch("/data/games/index.json");
  if (!res.ok) throw new Error("Não consegui carregar a lista de jogos");
  // O arquivo real (/public/data/games/index.json) é um array puro na raiz,
  // não um objeto { games: [...] } — embutimos aqui pra manter o resto do
  // código (GamesList, GameDetail) simples, sem mexer no formato do arquivo.
  const games = (await res.json()) as { id: string; name: string; file: string }[];
  return { games };
}

export async function fetchGame(file: string, gameId: string): Promise<GameDataFile> {
  const [res] = await Promise.all([fetch(`/data/games/${file}`), loadBuildOverrides()]);
  if (!res.ok) throw new Error(`Não consegui carregar os dados de ${file}`);
  const game: GameDataFile = await res.json();

  return {
    ...game,
    leveling_builds: (game.leveling_builds ?? []).map((b) => applyBuildOverride(gameId, b.id, b)),
    endgame_builds: (game.endgame_builds ?? []).map((b) => applyBuildOverride(gameId, b.id, b)),
  };
}
