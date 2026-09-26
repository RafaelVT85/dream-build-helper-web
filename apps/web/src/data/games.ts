import type { GameDataFile } from "../../../packages/data-schema/types";
import { applyBuildOverride, loadBuildOverrides } from "../lib/build-overrides";

// Camada de leitura de dados. Lê os JSONs estáticos que já existem em
// /public/data/games (mesma fonte de dados de hoje) e aplica por cima
// qualquer edição feita no painel de admin (salva via /api/save-build,
// armazenada no Vercel Blob) — o JSON estático nunca é alterado, os
// overrides só sobrepõem os campos editados na hora de exibir.

export async function fetchGamesIndex() {
  const res = await fetch("/data/games/index.json");
  if (!res.ok) throw new Error("Não consegui carregar a lista de jogos");
  return res.json() as Promise<{ games: { id: string; name: string; file: string }[] }>;
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
