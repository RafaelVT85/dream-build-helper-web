import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { fetchGame, fetchGamesIndex } from "../data/games";
import type { AnyBuild, ShapeBuild, ShapeTraveler } from "../../../../packages/data-schema/types";
import { isShapeGame } from "../../../../packages/data-schema/types";
import BuildView from "../components/BuildView";
import ShapeBuildView from "../components/ShapeBuildView";

export default function BuildDetail() {
  const { gameId, buildId } = useParams();
  const [params] = useSearchParams();
  const phase = params.get("phase");
  const travelerParam = params.get("traveler");
  const [build, setBuild] = useState<AnyBuild | null>(null);
  const [shapeData, setShapeData] = useState<{ traveler: ShapeTraveler; build: ShapeBuild } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId || !buildId) return;
    setBuild(null);
    setShapeData(null);
    fetchGamesIndex()
      .then((idx) => {
        const entry = idx.games.find((g) => g.id === gameId);
        if (!entry) throw new Error("Jogo não encontrado");
        return fetchGame(entry.file, gameId);
      })
      .then((game) => {
        if (isShapeGame(game)) {
          const traveler =
            game.travelers.find((t) => t.id === travelerParam) ??
            game.travelers.find((t) => t.builds?.some((b) => b.id === buildId));
          const found = traveler?.builds?.find((b) => b.id === buildId);
          if (!traveler || !found) throw new Error("Build não encontrada");
          setShapeData({ traveler, build: found });
          return;
        }
        const list = phase === "leveling" ? game.leveling_builds : game.endgame_builds;
        const found = list?.find((b) => b.id === buildId);
        if (!found) throw new Error("Build não encontrada");
        setBuild(found);
      })
      .catch((e) => setError(e.message));
  }, [gameId, buildId, phase, travelerParam]);

  if (error) return <p className="card" style={{ margin: 24 }}>{error}</p>;

  if (shapeData) {
    return (
      <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
        {shapeData.build.tag ? <span className="pill">{shapeData.build.tag}</span> : null}
        <h2 style={{ margin: "8px 0 16px" }}>
          {shapeData.traveler.name} — {shapeData.build.name}
        </h2>
        <ShapeBuildView traveler={shapeData.traveler} build={shapeData.build} />
      </div>
    );
  }

  if (!build) return <p style={{ margin: 24 }} className="muted">Carregando…</p>;

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <span className="pill">{phase === "leveling" ? "Leveling" : "Endgame"}</span>
      <h2 style={{ margin: "8px 0 16px" }}>{build.name}</h2>
      <BuildView build={build} />
    </div>
  );
}
