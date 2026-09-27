// Preferências de UI do Shape of Dreams que não são dados do jogo: Modo Jogo
// (esconde a "moldura" do app, só memories/essências) e Aparência
// (transparência do fundo + tema de cor). Porta fiel do public/app.js antigo
// (applyGameMode/appearance), com chaves de localStorage próprias do app novo
// pra não colidir com o site estático.

import { useEffect, useState } from "react";

const GAME_MODE_KEY = "ajuda-jogos:game-mode";
const APPEARANCE_KEY = "ajuda-jogos:appearance";

export type Appearance = { bgAlpha: number; theme: string };

const DEFAULT_APPEARANCE: Appearance = { bgAlpha: 100, theme: "roxo" };

export const THEME_OPTIONS: { value: string; label: string; accent: string }[] = [
  { value: "roxo", label: "Roxo (padrão)", accent: "#7c8cff" },
  { value: "azul", label: "Azul", accent: "#4aa8ff" },
  { value: "verde", label: "Verde", accent: "#4ade80" },
  { value: "vermelho", label: "Vermelho", accent: "#ff6b6b" },
];

function loadAppearance(): Appearance {
  try {
    return { ...DEFAULT_APPEARANCE, ...JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? "{}") };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function applyAppearance(a: Appearance) {
  const root = document.documentElement;
  root.style.setProperty("--bg-alpha", String(a.bgAlpha / 100));
  const theme = THEME_OPTIONS.find((t) => t.value === a.theme) ?? THEME_OPTIONS[0];
  root.style.setProperty("--accent", theme.accent);
  root.setAttribute("data-shape-theme", a.theme);
}

// Aplica a aparência salva assim que o app carrega (chamar uma vez no App raiz),
// pra ela valer em qualquer página, não só na tela de build.
export function useApplyStoredAppearance() {
  useEffect(() => {
    applyAppearance(loadAppearance());
  }, []);
}

// Hook completo (com setters) pra usar onde o painel de configurações vive.
export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(() => loadAppearance());

  useEffect(() => {
    applyAppearance(appearance);
    try {
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
    } catch {
      // localStorage indisponível — segue sem persistir
    }
  }, [appearance]);

  return { appearance, setAppearance };
}

function loadGameMode(): boolean {
  try {
    return localStorage.getItem(GAME_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

// Modo Jogo: esconde o cabeçalho do app e a "moldura" da tela do jogo, deixando
// só o conteúdo da build visível — pra jogar com a menor distração possível.
export function useGameMode() {
  const [gameMode, setGameModeState] = useState<boolean>(() => loadGameMode());

  useEffect(() => {
    document.body.classList.toggle("game-mode", gameMode);
    try {
      localStorage.setItem(GAME_MODE_KEY, gameMode ? "1" : "0");
    } catch {
      // ignora
    }
    return () => {
      document.body.classList.remove("game-mode");
    };
  }, [gameMode]);

  function setGameMode(value: boolean) {
    setGameModeState(value);
  }

  return { gameMode, setGameMode };
}
