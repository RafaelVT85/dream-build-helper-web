// Camada de "edições do usuário" do Shape of Dreams (e qualquer jogo que siga
// o mesmo schema): nome/raridade/categoria/efeito/ícone de skills, essências,
// estrelas e travelers, salvos no servidor (Vercel Blob) via /api/*, então
// aparecem pra qualquer visitante do site, não só em quem editou.
//
// Porta fiel da lógica que já existia em public/app.js (overridesStore,
// getOverride/setOverride, resolveIconSrc etc.) pro React, sem mexer nas 3
// funções serverless que já existiam (get-overrides/save-override/upload-icon).

import { useCallback, useEffect, useRef, useState } from "react";

export type OverridesStore = Record<string, Record<string, Record<string, unknown>>>;

const EMPTY_STORE: OverridesStore = { skill: {}, item: {}, star: {}, game: {} };

async function postJson(url: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 413) throw new Error("imagem grande demais para enviar");
    throw new Error((data as { error?: string }).error || `Erro ${res.status}`);
  }
  return data;
}

// Versão estrita: erro de verdade em vez de "vazio" — usada pra CONFIRMAR o
// que foi salvo (a carga normal da página continua tolerante a falhas).
async function fetchOverridesStrict(): Promise<OverridesStore> {
  const res = await fetch(`/api/get-overrides?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Erro ${res.status} ao conferir no servidor`);
  return res.json();
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

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Reduz a imagem antes de enviar: ícones aparecem pequenos, e prints/fotos
// grandes estouravam o limite de ~4,5 MB das funções da Vercel (a imagem em
// base64 ainda incha ~33%), falhando sem aviso claro.
async function prepareImage(file: File): Promise<{ base64: string; contentType: string }> {
  if (file.type === "image/svg+xml") {
    if (file.size > 1024 * 1024) throw new Error("SVG grande demais (máx. 1 MB)");
    return { base64: await fileToBase64(file), contentType: file.type };
  }
  try {
    const bmp = await createImageBitmap(file);
    const MAX = 256;
    const scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas indisponível");
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!blob) throw new Error("falha ao converter");
    return { base64: await fileToBase64(blob), contentType: "image/png" };
  } catch {
    if (file.size <= 3 * 1024 * 1024) {
      return { base64: await fileToBase64(file), contentType: file.type || "image/png" };
    }
    throw new Error("Não consegui ler essa imagem (formato não suportado ou grande demais). Tente PNG, JPG ou WebP menor.");
  }
}

export type SaveStatus = {
  pending: number; // edições ainda não confirmadas pelo servidor
  saving: boolean;
  failed: string | null; // última mensagem de erro (se houver edições presas)
  lastSavedAt: number | null;
  lastVerifiedAt: number | null;
  verifiedCount: number;
};

export type SaveResult = { ok: boolean; message: string };

type PatchEntry = { kind: string; key: string; patch: Record<string, unknown> };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Hook compartilhado: busca as edições salvas uma vez ao montar a página.
// Edições de texto/raridade (updateOverride) e imagens (updateIcon) passam por
// UMA fila, uma de cada vez e com novas tentativas — antes, dois salvamentos
// ao mesmo tempo no mesmo item se sobrescreviam no servidor. A tela atualiza
// na hora (otimista); saveStatus/saveNow mostram e confirmam o que de fato
// chegou no servidor.
export function useShapeOverrides() {
  const [overrides, setOverrides] = useState<OverridesStore>(EMPTY_STORE);
  const [loaded, setLoaded] = useState(false);

  const dirty = useRef(new Map<string, PatchEntry>()); // ainda não confirmado
  const saved = useRef(new Map<string, PatchEntry>()); // salvo nesta sessão (pra conferir)
  const inflight = useRef(0);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const timer = useRef<number | undefined>(undefined);
  const lastError = useRef<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>({
    pending: 0,
    saving: false,
    failed: null,
    lastSavedAt: null,
    lastVerifiedAt: null,
    verifiedCount: 0,
  });
  const meta = useRef({ lastSavedAt: null as number | null, lastVerifiedAt: null as number | null, verifiedCount: 0 });

  const refresh = useCallback(() => {
    setStatus({
      pending: dirty.current.size + inflight.current,
      saving: inflight.current > 0,
      failed: lastError.current,
      lastSavedAt: meta.current.lastSavedAt,
      lastVerifiedAt: meta.current.lastVerifiedAt,
      verifiedCount: meta.current.verifiedCount,
    });
  }, []);

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

  function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.current.then(fn, fn) as Promise<T>;
    chain.current = run.catch(() => undefined);
    return run;
  }

  function remember(entry: PatchEntry) {
    const id = `${entry.kind}|${entry.key}`;
    const prev = saved.current.get(id);
    saved.current.set(id, { ...entry, patch: { ...(prev?.patch ?? {}), ...entry.patch } });
  }

  async function postWithRetry(url: string, body: unknown) {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await postJson(url, body);
      } catch (err) {
        lastErr = err;
        if (attempt < 2) await sleep(800 * (attempt + 1));
      }
    }
    throw lastErr;
  }

  // Esvazia as edições pendentes, uma a uma. Se uma falhar de vez, ela volta
  // pra fila de "não salvas" (nada é descartado) e o erro fica visível.
  const flush = useCallback((): Promise<void> => {
    return enqueue(async () => {
      while (dirty.current.size > 0) {
        const [id, entry] = dirty.current.entries().next().value as [string, PatchEntry];
        dirty.current.delete(id);
        inflight.current += 1;
        refresh();
        try {
          // undefined não existe em JSON: manda null pra apagar o campo no servidor
          const patch = Object.fromEntries(Object.entries(entry.patch).map(([k, v]) => [k, v === undefined ? null : v]));
          await postWithRetry("/api/save-override", { kind: entry.kind, key: entry.key, patch });
          remember(entry);
          meta.current.lastSavedAt = Date.now();
          lastError.current = null;
        } catch (err) {
          const newer = dirty.current.get(id);
          dirty.current.set(id, { ...entry, patch: { ...entry.patch, ...(newer?.patch ?? {}) } });
          lastError.current = err instanceof Error ? err.message : String(err);
          inflight.current -= 1;
          refresh();
          return;
        }
        inflight.current -= 1;
        refresh();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const scheduleFlush = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), 500);
  }, [flush]);

  async function updateOverride(kind: string, key: string, patch: Record<string, unknown>) {
    setOverrides((prev) => ({
      ...prev,
      [kind]: { ...(prev[kind] || {}), [key]: { ...(prev[kind]?.[key] || {}), ...patch } },
    }));
    const id = `${kind}|${key}`;
    const cur = dirty.current.get(id);
    dirty.current.set(id, { kind, key, patch: { ...(cur?.patch ?? {}), ...patch } });
    lastError.current = null;
    refresh();
    scheduleFlush();
  }

  async function updateIcon(kind: string, key: string, relPath: string, file: File): Promise<string> {
    const { base64, contentType } = await prepareImage(file);
    return enqueue(async () => {
      inflight.current += 1;
      refresh();
      try {
        const result = await postWithRetry("/api/upload-icon", { kind, key, relPath, dataBase64: base64, contentType });
        const url = result.url as string;
        setOverrides((prev) => ({
          ...prev,
          [kind]: { ...(prev[kind] || {}), [key]: { ...(prev[kind]?.[key] || {}), icon: url } },
        }));
        remember({ kind, key, patch: { icon: url } });
        meta.current.lastSavedAt = Date.now();
        return url;
      } finally {
        inflight.current -= 1;
        refresh();
      }
    });
  }

  // Botão "Salvar": envia o que estiver pendente e CONFERE no servidor se
  // cada alteração feita nesta sessão está mesmo lá.
  const saveNow = useCallback(async (): Promise<SaveResult> => {
    window.clearTimeout(timer.current);
    await flush();
    if (dirty.current.size > 0) {
      return { ok: false, message: `Não consegui salvar ${dirty.current.size} alteração(ões): ${lastError.current ?? "erro desconhecido"}. Elas continuam aqui — tente de novo.` };
    }
    try {
      const server = await fetchOverridesStrict();
      const bad: string[] = [];
      let count = 0;
      for (const { kind, key, patch } of saved.current.values()) {
        for (const [field, value] of Object.entries(patch)) {
          count += 1;
          const got = (server[kind]?.[key] as Record<string, unknown> | undefined)?.[field];
          const empty = value === undefined || value === null || value === "";
          if (empty ? got !== undefined && got !== null : got !== value) bad.push(`${kind}:${key}.${field}`);
        }
      }
      if (bad.length) {
        return { ok: false, message: `O servidor não tem ${bad.length} alteração(ões) que você fez: ${bad.slice(0, 3).join(", ")}${bad.length > 3 ? "…" : ""}. Faça a edição de novo e clique em Salvar.` };
      }
      meta.current.lastVerifiedAt = Date.now();
      meta.current.verifiedCount = count;
      refresh();
      return { ok: true, message: count ? `Tudo salvo e conferido no servidor (${count} campo${count > 1 ? "s" : ""}).` : "Nada para salvar ainda." };
    } catch (err) {
      return { ok: false, message: `Salvei, mas não consegui conferir no servidor: ${err instanceof Error ? err.message : String(err)}` };
    }
  }, [flush, refresh]);

  // Fechar/recarregar a aba com edição pendente: avisa; e ao esconder a aba,
  // tenta mandar o que sobrou.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current.size > 0 || inflight.current > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const onHide = () => {
      if (document.visibilityState === "hidden" && dirty.current.size > 0) void flush();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flush]);

  return { overrides, loaded, updateOverride, updateIcon, saveStatus: status, saveNow };
}
