import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchGame, fetchGamesIndex } from "../data/games";
import type { GameDataFile } from "../../../../packages/data-schema/types";
import { isShapeGame } from "../../../../packages/data-schema/types";
import { useShapeOverrides } from "../lib/shapeOverrides";
import { TravelerAvatar } from "../components/ShapeVisuals";
import ShapeGallery from "../components/ShapeGallery";

export default function GameDetail() {
  const { gameId } = useParams();
  const [game, setGame] = useState<GameDataFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [travelerId, setTravelerId] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const { overrides, updateOverride, updateIcon } = useShapeOverrides();

  useEffect(() => {
    if (!gameId) return;
    fetchGamesIndex()
      .then((idx) => {
        const entry = idx.games.find((g) => g.id === gameId);
        if (!entry) throw new Error("Jogo não encontrado");
        return fetchGame(entry.file, gameId);
      })
      .then((g) => {
        setGame(g);
        if (isShapeGame(g) && g.travelers.length) setTravelerId(g.travelers[0].id);
      })
      .catch((e) => setError(e.message));
  }, [gameId]);

  if (error) return <p className="card" style={{ margin: 24 }}>{error}</p>;
  if (!game) return <p style={{ margin: 24 }} className="muted">Carregando…</p>;

  if (isShapeGame(game)) {
    const traveler = game.travelers.find((t) => t.id === travelerId) ?? game.travelers[0];
    const builds = [...(traveler?.builds ?? [])].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "24px 24px 0", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {game.travelers.map((t) => (
              <button
                key={t.id}
                onClick={() => setTravelerId(t.id)}
                className="pill"
                style={{
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: "1px solid var(--border)",
                  background: t.id === traveler?.id ? "var(--accent)" : "transparent",
                  color: t.id === traveler?.id ? "#101014" : "var(--accent)",
                  fontWeight: t.id === traveler?.id ? 700 : 400,
                }}
              >
                <span className="avatar-sm">
                  <TravelerAvatar traveler={{ id: t.id, name: t.name, icon: (overrides.traveler?.[t.id]?.icon as string) ?? t.icon }} />
                </span>
                {t.name}
              </button>
            ))}
          </div>
          <button
            className="pill"
            style={{
              cursor: "pointer",
              border: "1px solid var(--border)",
              background: galleryOpen ? "var(--accent)" : "transparent",
              color: galleryOpen ? "#101014" : "var(--accent)",
            }}
            onClick={() => setGalleryOpen((v) => !v)}
          >
            {galleryOpen ? "← Voltar pras builds" : "🖼️ Galeria"}
          </button>
        </div>

        {galleryOpen ? (
          <ShapeGallery game={game} overrides={overrides} updateOverride={updateOverride} updateIcon={updateIcon} />
        ) : (
          <div className="grid">
            {builds.length === 0 ? (
              <p className="muted" style={{ padding: "0 24px", gridColumn: "1 / -1" }}>
                Nenhuma build cadastrada ainda pra {traveler?.name ?? "esse personagem"}.
              </p>
            ) : (
              builds.map((b) => (
                <Link
                  key={b.id}
                  to={`/jogos/${gameId}/builds/${b.id}?traveler=${traveler?.id}`}
                  className="card"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {b.tag ? <span className="pill">{b.tag}</span> : null}
                  <h3 style={{ margin: "8px 0 0" }}>{b.name}</h3>
                  <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>
                    👍 {b.likes ?? 0} · 👁 {b.views ?? 0}
                  </p>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

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
