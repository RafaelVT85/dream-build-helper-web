import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchGame, fetchGamesIndex } from "../data/games";
import type { GameDataFile } from "../../../packages/data-schema/types";

export default function GameDetail() {
  const { gameId } = useParams();
  const [game, setGame] = useState<GameDataFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;
    fetchGamesIndex()
      .then((idx) => {
        const entry = idx.games.find((g) => g.id === gameId);
        if (!entry) throw new Error("Jogo não encontrado");
        return fetchGame(entry.file, gameId);
      })
      .then(setGame)
      .catch((e) => setError(e.message));
  }, [gameId]);

  if (error) return <p className="card" style={{ margin: 24 }}>{error}</p>;
  if (!game) return <p style={{ margin: 24 }} className="muted">Carregando…</p>;

  const allBuilds = [
    ...(game.leveling_builds ?? []).map((b) => ({ ...b, phase: "leveling" as const })),
    ...(game.endgame_builds ?? []).map((b) => ({ ...b, phase: "endgame" as const })),
  ];

  return (
    <div className="grid">
      {allBuilds.map((b) => (
        <Link
          key={`${b.phase}-${b.id}`}
          to={`/jogos/${gameId}/builds/${b.id}?phase=${b.phase}`}
          className="card"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <span className="pill">{b.phase === "leveling" ? "Leveling" : "Endgame"}</span>
          <h3 style={{ margin: "8px 0 0" }}>{b.name}</h3>
        </Link>
      ))}
    </div>
  );
}
