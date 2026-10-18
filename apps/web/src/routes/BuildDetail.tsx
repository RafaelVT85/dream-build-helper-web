import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { fetchGame, fetchGamesIndex } from "../data/games";
import type { AnyBuild, ShapeBuild, ShapeTraveler } from "../../../../packages/data-schema/types";
import { isShapeGame } from "../../../../packages/data-schema/types";
import { useShapeOverrides } from "../lib/shapeOverrides";
import { useGameMode } from "../lib/shapeUiPrefs";
import { PiPPortal, usePictureInPicture } from "../lib/shapePip";
import BuildView from "../components/BuildView";
import ShapeBuildView from "../components/ShapeBuildView";

export default function BuildDetail() {
  const { gameId, buildId } = useParams();
  const [params] = useSearchParams();
  const phase = params.get("phase");
  const travelerParam = params.get("traveler");
  const [build, setBuild] = useState<AnyBuild | null>(null);
  const [shapeData, setShapeData] = useState<{ traveler: ShapeTraveler; build: ShapeBuild } | null>(null);
  const [gameName, setGameName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { overrides, updateOverride, saveStatus, saveNow } = useShapeOverrides();
  const { gameMode, setGameMode } = useGameMode();
  const { isSupported: pipSupported, pipWindow, openPiP, closePiP } = usePictureInPicture();

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
        setGameName(String((game as { name?: unknown }).name ?? ""));
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

  useEffect(() => {
    const n = shapeData ? shapeData.build.name : build ? String(build.name ?? "") : "";
    if (n) document.title = `${n} — Ajuda Jogos`;
  }, [shapeData, build]);

  if (error)
    return (
      <div className="card" style={{ margin: 24 }}>
        <p style={{ marginTop: 0 }}>{error}</p>
        <Link to={gameId ? `/jogos/${gameId}` : "/"} className="pill" style={{ textDecoration: "none" }}>← Voltar</Link>
      </div>
    );

  if (shapeData) {
    const title = `${shapeData.traveler.name} — ${shapeData.build.name}`;
    const buildContent = (
      <ShapeBuildView traveler={shapeData.traveler} build={shapeData.build} overrides={overrides} updateOverride={updateOverride} saveStatus={saveStatus} saveNow={saveNow} />
    );

    const sorted = [...(shapeData.traveler.builds ?? [])].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    const idx = sorted.findIndex((b) => b.id === shapeData.build.id);
    const prev = idx > 0 ? sorted[idx - 1] : null;
    const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;
    const backTo = `/jogos/${gameId}?traveler=${shapeData.traveler.id}`;
    const buildLink = (id: string) => `/jogos/${gameId}/builds/${id}?traveler=${shapeData.traveler.id}`;

    return (
      <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <Link to={backTo} className="pill" style={{ textDecoration: "none" }}>
            ← {shapeData.traveler.name}
          </Link>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="pill"
            style={{
              cursor: "pointer",
              border: "1px solid var(--border)",
              background: gameMode ? "var(--accent)" : "transparent",
              color: gameMode ? "#101014" : "var(--accent)",
            }}
            onClick={() => setGameMode(!gameMode)}
          >
            {gameMode ? "🎮 Sair do Modo Jogo" : "🎮 Modo Jogo"}
          </button>
          {pipSupported ? (
            <button
              className="pill"
              style={{
                cursor: "pointer",
                border: "1px solid var(--border)",
                background: pipWindow ? "var(--accent)" : "transparent",
                color: pipWindow ? "#101014" : "var(--accent)",
              }}
              onClick={() => (pipWindow ? closePiP() : openPiP(title))}
            >
              {pipWindow ? "✕ Fechar PiP" : "📌 Picture-in-Picture"}
            </button>
          ) : null}
        </div>
        </div>

        {shapeData.build.tag ? <span className="pill">{shapeData.build.tag}</span> : null}
        <h2 style={{ margin: "8px 0 16px" }}>{title}</h2>

        {pipWindow ? (
          <>
            <p className="muted">Aberto em uma janela flutuante (Picture-in-Picture).</p>
            <PiPPortal pipWindow={pipWindow}>
              <h2 style={{ margin: "0 0 16px" }}>{title}</h2>
              {buildContent}
            </PiPPortal>
          </>
        ) : (
          buildContent
        )}

        {prev || next ? (
          <nav style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
            {prev ? <Link to={buildLink(prev.id)} className="pill" style={{ textDecoration: "none" }}>← {prev.name}</Link> : <span />}
            {next ? <Link to={buildLink(next.id)} className="pill" style={{ textDecoration: "none" }}>{next.name} →</Link> : null}
          </nav>
        ) : null}
      </div>
    );
  }

  if (!build) return <p style={{ margin: 24 }} className="muted">Carregando…</p>;

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <Link to={`/jogos/${gameId}`} className="pill" style={{ textDecoration: "none", marginBottom: 12, display: "inline-block" }}>
        ← {gameName || "Voltar"}
      </Link>
      <br />
      <span className="pill">{phase === "leveling" ? "Leveling" : "Endgame"}</span>
      <h2 style={{ margin: "8px 0 16px" }}>{build.name}</h2>
      <BuildView build={build} />
    </div>
  );
}
