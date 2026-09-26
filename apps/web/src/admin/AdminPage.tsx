import { useEffect, useState, type FormEvent } from "react";
import { fetchGamesIndex, fetchGame } from "../data/games";
import { getBuildOverride, loadBuildOverrides, setBuildOverrideLocal } from "../lib/build-overrides";
import type { AnyBuild, GameDataFile } from "../../../packages/data-schema/types";

// Painel de admin simples: login por senha (ADMIN_PASSWORD no Vercel),
// escolhe jogo + build, edita os campos como JSON e salva. A senha nunca
// fica salva no navegador (só em memória, nesta sessão) e é reenviada a
// cada salvamento — o servidor (/api/save-build) que valida.
//
// Editor é JSON puro de propósito: os campos de build mudam de jogo pra
// jogo (Diablo tem equipment/paragon/etc, outro jogo pode ter outra
// estrutura) e um formulário fixo erraria isso. JSON dá controle total
// sem arriscar inventar uma estrutura que não bate com o que os outros
// campos do app esperam.

type GameIndexEntry = { id: string; name: string; file: string };

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(false);

  const [games, setGames] = useState<GameIndexEntry[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [gameData, setGameData] = useState<GameDataFile | null>(null);
  const [selectedBuildKey, setSelectedBuildKey] = useState<string>(""); // "leveling:id" ou "endgame:id"

  const [jsonText, setJsonText] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGamesIndex().then((idx) => setGames(idx.games));
  }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setCheckingAuth(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
      setAuthed(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setCheckingAuth(false);
    }
  }

  async function handleSelectGame(gameId: string) {
    setSelectedGame(gameId);
    setSelectedBuildKey("");
    setJsonText("");
    setSaveOk(null);
    setSaveError(null);
    if (!gameId) {
      setGameData(null);
      return;
    }
    const entry = games.find((g) => g.id === gameId);
    if (!entry) return;
    await loadBuildOverrides();
    const data = await fetchGame(entry.file, gameId);
    setGameData(data);
  }

  function handleSelectBuild(key: string) {
    setSelectedBuildKey(key);
    setSaveOk(null);
    setSaveError(null);
    if (!gameData || !key) {
      setJsonText("");
      return;
    }
    const [phase, id] = key.split(":");
    const list = phase === "leveling" ? gameData.leveling_builds : gameData.endgame_builds;
    const build = list?.find((b) => b.id === id);
    if (!build) return;
    setJsonText(JSON.stringify(build, null, 2));
  }

  async function handleSave() {
    if (!selectedGame || !selectedBuildKey) return;
    const [phase, buildId] = selectedBuildKey.split(":");
    setSaving(true);
    setSaveError(null);
    setSaveOk(null);
    try {
      let patch: AnyBuild;
      try {
        patch = JSON.parse(jsonText);
      } catch {
        throw new Error("JSON inválido — confira vírgulas e chaves antes de salvar");
      }
      const res = await fetch("/api/save-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, gameId: selectedGame, buildId, phase, patch }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
      setBuildOverrideLocal(selectedGame, buildId, patch);
      setSaveOk("Salvo! A alteração já aparece pra quem visitar o app.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (!authed) {
    return (
      <div style={{ padding: 24, maxWidth: 400, margin: "0 auto" }}>
        <h2>Painel de admin</h2>
        <form onSubmit={handleLogin} className="card" style={{ display: "grid", gap: 12 }}>
          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
              autoFocus
            />
          </label>
          {authError && <p style={{ color: "#f66" }}>{authError}</p>}
          <button type="submit" disabled={checkingAuth || !password}>
            {checkingAuth ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    );
  }

  const currentOverride = selectedGame && selectedBuildKey
    ? getBuildOverride(selectedGame, selectedBuildKey.split(":")[1])
    : null;

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h2>Painel de admin</h2>
      <p className="muted">
        Edite os campos da build como JSON e salve. A alteração fica guardada por cima do
        arquivo original e aparece pra todo mundo que abrir o app.
      </p>

      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <label>
          Jogo
          <select
            value={selectedGame}
            onChange={(e) => handleSelectGame(e.target.value)}
            style={{ display: "block", padding: 8, marginTop: 4 }}
          >
            <option value="">Selecione…</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </label>

        {gameData && (
          <label>
            Build
            <select
              value={selectedBuildKey}
              onChange={(e) => handleSelectBuild(e.target.value)}
              style={{ display: "block", padding: 8, marginTop: 4, minWidth: 260 }}
            >
              <option value="">Selecione…</option>
              <optgroup label="Leveling">
                {(gameData.leveling_builds ?? []).map((b) => (
                  <option key={b.id} value={`leveling:${b.id}`}>{b.name}</option>
                ))}
              </optgroup>
              <optgroup label="Endgame">
                {(gameData.endgame_builds ?? []).map((b) => (
                  <option key={b.id} value={`endgame:${b.id}`}>{b.name}</option>
                ))}
              </optgroup>
            </select>
          </label>
        )}
      </div>

      {selectedBuildKey && (
        <>
          {currentOverride?._updatedAt && (
            <p className="muted" style={{ fontSize: 13 }}>
              Última edição salva: {new Date(currentOverride._updatedAt).toLocaleString("pt-BR")}
            </p>
          )}
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 400,
              fontFamily: "monospace",
              fontSize: 13,
              padding: 12,
              background: "var(--panel)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          />
          <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </button>
            {saveError && <span style={{ color: "#f66" }}>{saveError}</span>}
            {saveOk && <span style={{ color: "#6f6" }}>{saveOk}</span>}
          </div>
        </>
      )}
    </div>
  );
}
