// Camada de "edições do usuário" do Shape of Dreams (e qualquer jogo que siga
// o mesmo schema): nome/raridade/categoria/efeito/ícone de skills, essências,
// estrelas e travelers, salvos no servidor (Vercel Blob) via /api/*, então
// aparecem pra qualquer visitante do site, não só em quem editou.
//
// Porta fiel da lógica que já existia em public/app.js (overridesStore,
// getOverride/setOverride, resolveIconSrc etc.) pro React, sem mexer nas 3
// funções serverless que já existiam (get-overrides/save-override/upload-icon).

import { useEffect, useState } from "react";

export type OverridesStore = Record<string, Record<string, Record<string, unknown>>>;

const EMPTY_STORE: OverridesStore = { skill: {}, item: {}, star: {}, game: {} };

async function postJson(url: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Erro ${res.status}`);
  return data;
}

export async function fetchOverrides(): Promise<OverridesStore> {
  try {
    const res = await fetch("/api/get-overrides");
    if (res.ok) return await res.json();
  } catch {
    // sem internet/servidor fora do ar: segue só com os dados estáticos
  }
  return EMPTY_STORE;
}

export function overrideKeyFor(item: { key?: string; id?: string; name: string }): string {
  return item.key || item.id || item.name;
}

export function getOverride(overrides: OverridesStore, kind: string, key?: string): Record<string, unknown> {
  return (key && overrides[kind]?.[key]) || {};
}

export function withOverride<T extends { key?: string; id?: string; name: string }>(
  overrides: OverridesStore,
  kind: string,
  item: T,
): T {
  return { ...item, ...getOverride(overrides, kind, overrideKeyFor(item)) };
}

// Ícones locais: opcional (src/data/icons/). Se o arquivo não existir, cai
// pro selo colorido / avatar de iniciais no componente que consome isso.
export function relIconPath(kind: string, key: string, value?: string): string {
  if (kind === "skill") return `memorias/${key}.png`;
  if (kind === "item") return `essencias/${key}.png`;
  if (kind === "star") return `memorias/${value}/${key}.png`; // value = categoria
  if (kind === "traveler") return `travelers/${key}.png`;
  if (kind === "game") return `covers/${key}.png`;
  return `${key}.png`;
}

export function resolveIconSrc(explicitPath: string): string {
  // Uploads pela Galeria salvam uma URL completa do Vercel Blob; ícones que
  // já vieram prontos no site são caminho relativo dentro de data/icons/.
  if (/^https?:\/\//i.test(explicitPath)) return explicitPath;
  return `/data/icons/${encodeURI(explicitPath)}`;
}

const AVATAR_COLORS = ["#7c6cf0", "#e0556b", "#4ade80", "#f0a63c", "#5cc8ff", "#ff8fb3", "#b389ff", "#7ed77e"];
export function colorFor(text: string): string {
  let hash = 0;
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Hook compartilhado: busca as edições salvas uma vez ao montar a página, e
// expõe funções pra editar campo de texto/raridade (updateOverride) ou subir
// uma imagem (updateIcon) — ambas otimistas (atualizam a tela na hora) e
// avisam com um alert() se o servidor recusar, igual ao site antigo.
export function useShapeOverrides() {
  const [overrides, setOverrides] = useState<OverridesStore>(EMPTY_STORE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchOverrides().then((o) => {
      if (!cancelled) {
        setOverrides(o);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function updateOverride(kind: string, key: string, patch: Record<string, unknown>) {
    setOverrides((prev) => ({
      ...prev,
      [kind]: { ...(prev[kind] || {}), [key]: { ...(prev[kind]?.[key] || {}), ...patch } },
    }));
    try {
      await postJson("/api/save-override", { kind, key, patch });
    } catch (err) {
      alert("Não consegui salvar no servidor (fica só nessa sessão): " + (err instanceof Error ? err.message : String(err)));
    }
  }

  async function updateIcon(kind: string, key: string, relPath: string, file: File): Promise<string> {
    const base64 = await fileToBase64(file);
    const result = await postJson("/api/upload-icon", {
      kind,
      key,
      relPath,
      dataBase64: base64,
      contentType: file.type || "image/png",
    });
    const url = result.url as string;
    setOverrides((prev) => ({
      ...prev,
      [kind]: { ...(prev[kind] || {}), [key]: { ...(prev[kind]?.[key] || {}), icon: url } },
    }));
    return url;
  }

  return { overrides, loaded, updateOverride, updateIcon };
}
