// Overrides de builds salvos pelo painel de admin (Vercel Blob, via /api/*).
// Mesmo padrão já usado pelo Shape of Dreams (Galeria): carrega tudo uma vez,
// guarda em memória, e cada override é aplicado por cima do JSON estático
// na hora de exibir — o arquivo JSON original nunca é alterado.

export type BuildOverride = {
  _gameId?: string;
  _buildId?: string;
  _phase?: "leveling" | "endgame";
  _updatedAt?: string;
  [field: string]: unknown;
};

type OverridesMap = Record<string, BuildOverride>;

let overridesStore: OverridesMap = {};
let loaded = false;
let loadPromise: Promise<void> | null = null;

function buildKey(gameId: string, buildId: string) {
  const safe = (s: string) => String(s).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${safe(gameId)}__${safe(buildId)}`;
}

export async function loadBuildOverrides(): Promise<void> {
  if (loaded) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const res = await fetch("/api/get-build-overrides");
      if (res.ok) overridesStore = await res.json();
    } catch {
      // sem internet ou API fora do ar: segue só com os dados estáticos do JSON
    } finally {
      loaded = true;
    }
  })();
  return loadPromise;
}

export function getBuildOverride(gameId: string, buildId: string): BuildOverride {
  return overridesStore[buildKey(gameId, buildId)] || {};
}

// Aplica o override por cima do build original. Campos vazios/ausentes no
// override não sobrescrevem o original (mesma regra do save-build.js, que
// não grava campos vazios).
export function applyBuildOverride<T extends Record<string, unknown>>(
  gameId: string,
  buildId: string,
  build: T
): T {
  const override = getBuildOverride(gameId, buildId);
  const { _gameId, _buildId, _phase, _updatedAt, ...patch } = override;
  return { ...build, ...patch };
}

// Usado pelo painel de admin depois de salvar, pra refletir na hora sem
// esperar um novo fetch.
export function setBuildOverrideLocal(gameId: string, buildId: string, patch: BuildOverride) {
  overridesStore[buildKey(gameId, buildId)] = {
    ...getBuildOverride(gameId, buildId),
    ...patch,
  };
}

export function invalidateBuildOverrides() {
  loaded = false;
  loadPromise = null;
}
