// Galeria de ícones do Shape of Dreams: ver o que ainda falta (ou tudo),
// enviar uma imagem e editar nome/raridade/categoria/efeito de cada skill,
// essência, estrela ou traveler. Porta fiel da Galeria do public/app.js
// antigo, usando as mesmas 3 funções serverless (nada mudou no backend).

import { useMemo, useState, type ChangeEvent } from "react";
import type { ShapeGameDataFile } from "../../../../packages/data-schema/types";
import { overrideKeyFor, withOverride, relIconPath, type OverridesStore } from "../lib/shapeOverrides";
import { IconOrBadge, TravelerAvatar, CATEGORY_LABEL } from "./ShapeVisuals";

const RARITY_OPTIONS = ["", "common", "rare", "epic", "legendary", "unique"];
const RARITY_LABEL: Record<string, string> = {
  "": "— sem raridade —",
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  unique: "Unique",
};
const CATEGORY_OPTIONS = ["destruicao", "vida", "imaginacao", "flexivel"];

type Kind = "traveler" | "skill" | "item" | "star";
type GalleryItem = {
  key?: string;
  id?: string;
  name: string;
  type?: string;
  category?: string;
  rarity?: string;
  icon?: string;
  effect?: string;
};

type UpdateOverride = (kind: string, key: string, patch: Record<string, unknown>) => Promise<void>;
type UpdateIcon = (kind: string, key: string, relPath: string, file: File) => Promise<string>;

function collectGalleryItems(game: ShapeGameDataFile, overrides: OverridesStore) {
  const skills = new Map<string, GalleryItem>();
  const essences = new Map<string, GalleryItem>();
  const stars = new Map<string, GalleryItem>();
  const travelers: GalleryItem[] = [];

  game.travelers.forEach((t) => {
    travelers.push({ id: t.id, name: t.name, icon: withOverride(overrides, "traveler", t).icon });
    (t.builds ?? []).forEach((b) => {
      (b.memories ?? []).forEach((m) => {
        const k = overrideKeyFor(m);
        if (!skills.has(k)) {
          skills.set(k, withOverride(overrides, "skill", { key: m.key, name: m.name, type: m.type, effect: m.effect, icon: m.icon }));
        }
        (m.essences ?? []).forEach((e) => {
          const ek = overrideKeyFor(e);
          if (!essences.has(ek)) {
            essences.set(
              ek,
              withOverride(overrides, "item", { key: e.key, name: e.name, type: e.type, rarity: e.rarity, effect: e.effect, icon: e.icon }),
            );
          }
        });
      });
    });
    (t.constellation ?? []).forEach((s) => {
      const sk = overrideKeyFor(s);
      if (!stars.has(sk)) {
        stars.set(sk, withOverride(overrides, "star", { key: s.key, name: s.name, category: s.category, effect: s.effect, icon: s.icon }));
      }
    });
  });

  return {
    travelers,
    skills: [...skills.values()].sort((a, b) => a.name.localeCompare(b.name)),
    essences: [...essences.values()].sort((a, b) => a.name.localeCompare(b.name)),
    stars: [...stars.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export default function ShapeGallery({
  game,
  overrides,
  updateOverride,
  updateIcon,
}: {
  game: ShapeGameDataFile;
  overrides: OverridesStore;
  updateOverride: UpdateOverride;
  updateIcon: UpdateIcon;
}) {
  const [filter, setFilter] = useState<"missing" | "all">("missing");
  const data = useMemo(() => collectGalleryItems(game, overrides), [game, overrides]);

  const filterBtnStyle = (active: boolean) => ({
    cursor: "pointer",
    border: "1px solid var(--border)",
    background: active ? "var(--accent)" : "transparent",
    color: active ? "#101014" : "var(--accent)",
    fontWeight: active ? 700 : 400,
  });

  function Section({ title, kind, items }: { title: string; kind: Kind; items: GalleryItem[] }) {
    const filtered = filter === "all" ? items : items.filter((i) => !i.icon);
    return (
      <div style={{ marginBottom: 28 }}>
        <h4 style={{ margin: "0 0 10px" }}>{title}</h4>
        {filtered.length === 0 ? (
          <p className="muted">{filter === "all" ? "Nada aqui ainda." : "Tudo com ícone! 🎉"}</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map((item) => (
              <GalleryRow
                key={`${kind}-${item.key ?? item.id ?? item.name}`}
                kind={kind}
                item={item}
                updateOverride={updateOverride}
                updateIcon={updateIcon}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 24px 40px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button className="pill" style={filterBtnStyle(filter === "missing")} onClick={() => setFilter("missing")}>
          Faltando ícone
        </button>
        <button className="pill" style={filterBtnStyle(filter === "all")} onClick={() => setFilter("all")}>
          Todos
        </button>
      </div>
      <Section title="Personagens" kind="traveler" items={data.travelers} />
      <Section title="Memories" kind="skill" items={data.skills} />
      <Section title="Essências" kind="item" items={data.essences} />
      <Section title="Estrelas da constelação" kind="star" items={data.stars} />
    </div>
  );
}

function GalleryRow({
  kind,
  item,
  updateOverride,
  updateIcon,
}: {
  kind: Kind;
  item: GalleryItem;
  updateOverride: UpdateOverride;
  updateIcon: UpdateIcon;
}) {
  const key = item.key || item.id || item.name;
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState(item.name);
  const [effect, setEffect] = useState(item.effect ?? "");

  const inputStyle = {
    padding: 6,
    background: "var(--panel)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 6,
  };

  async function handleFile(ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const relPath = relIconPath(kind, key, kind === "star" ? item.category : item.type);
      await updateIcon(kind, key, relPath, file);
    } catch (err) {
      alert("Erro ao salvar: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
      ev.target.value = "";
    }
  }

  if (kind === "traveler") {
    return (
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <TravelerAvatar traveler={{ id: item.id!, name: item.name, icon: item.icon }} />
        <span style={{ flex: 1 }}>{item.name}</span>
        <label className="pill" style={{ cursor: "pointer" }}>
          {uploading ? "Enviando…" : item.icon ? "Trocar imagem" : "Enviar imagem"}
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        </label>
      </div>
    );
  }

  return (
    <div className="card" style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
      <IconOrBadge iconKey={item.key} kind={kind} value={kind === "star" ? item.category : item.type} explicitPath={item.icon} rarity={item.rarity} />
      <div style={{ flex: 1, minWidth: 220, display: "grid", gap: 6 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== item.name && updateOverride(kind, key, { name })}
          style={inputStyle}
        />
        {kind === "item" && (
          <select
            value={item.rarity ?? ""}
            onChange={(e) => updateOverride(kind, key, { rarity: e.target.value || undefined })}
            style={inputStyle}
          >
            {RARITY_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {RARITY_LABEL[r]}
              </option>
            ))}
          </select>
        )}
        {kind === "star" && (
          <select
            value={item.category ?? ""}
            onChange={(e) => updateOverride(kind, key, { category: e.target.value })}
            style={inputStyle}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        )}
        <textarea
          value={effect}
          onChange={(e) => setEffect(e.target.value)}
          onBlur={() => effect !== (item.effect ?? "") && updateOverride(kind, key, { effect: effect || undefined })}
          placeholder="Descrição / efeito..."
          style={{ ...inputStyle, minHeight: 50, fontFamily: "inherit" }}
        />
      </div>
      <label className="pill" style={{ cursor: "pointer", alignSelf: "flex-start" }}>
        {uploading ? "Enviando…" : item.icon ? "Trocar imagem" : "Enviar imagem"}
        <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
      </label>
    </div>
  );
}
