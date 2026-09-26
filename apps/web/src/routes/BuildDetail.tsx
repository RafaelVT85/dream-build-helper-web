import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { fetchGame, fetchGamesIndex } from "../data/games";
import type { AnyBuild, GameDataFile } from "../../../packages/data-schema/types";
import BuildView from "../components/BuildView";

export default function BuildDetail() {
  const { gameId, buildId } = useParams();
  const [params] = useSearchParams();
  const phase = params.get("phase");
  const [build, setBuild] = useState<AnyBuild | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId || !buildId) return;
    fetchGamesIndex()
      .then((idx) => {
        const entry = idx.games.find((g) => g.id === gameId);
        if (!entry) throw new Error("Jogo não encontrado");
        return fetchGame(entry.file, gameId);
      })
      .then((game: GameDataFile) => {
        const list = phase === "leveling" ? game.leveling_builds : game.endgame_builds;
        const found = list?.find((b) => b.id === buildId);
        if (!found) throw new Error("Build não encontrada");
        setBuild(found);
      })
      .catch((e) => setError(e.message));
  }, [gameId, buildId, phase]);

  if (error) return <p className="card" style={{ margin: 24 }}>{error}</p>;
  if (!build) return <p style={{ margin: 24 }} className="muted">Carregando…</p>;

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <span className="pill">{phase === "leveling" ? "Leveling" : "Endgame"}</span>
      <h2 style={{ margin: "8px 0 16px" }}>{build.name}</h2>
      <BuildView build={build} />
    </div>
  );
}
