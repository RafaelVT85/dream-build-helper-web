import { useState } from "react";
import type { ShapeBuild, ShapeEssence, ShapeMemory, ShapeTraveler } from "../../../../packages/data-schema/types";
import { overrideKeyFor, withOverride, type OverridesStore } from "../lib/shapeOverrides";
import { CATEGORY_LABEL, IconOrBadge } from "./ShapeVisuals";

// Exibição de uma build no schema do Shape of Dreams (memories/essences/
// constelação) — bem diferente do schema leveling_builds/endgame_builds do
// Diablo (ver BuildView.tsx pra esse outro caso). Porta a lógica visual do
// public/app.js antigo (ícones reais com fallback, memórias expansíveis,
// essências marcáveis como "já consegui", constelação recolhida por padrão,
// e um modo de edição rápida) pro React, sem alterar os dados que o Rafael
// já editou manualmente (a edição em si passa pelas mesmas 3 funções
// serverless que já existiam — nada mudou no backend).

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

function abbrevEssence(name: string): string {
  return name.replace(/^Essência (de|da|do) /, "Es. ");
}

const OBTAINED_KEY = "ajuda-jogos:obtained";

function loadObtained(): Record<string, Record<string, boolean>> {
  try {
    return JSON.parse(localStorage.getItem(OBTAINED_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function setObtainedFlag(buildId: string, key: string, value: boolean) {
  try {
    const store = loadObtained();
    store[buildId] = store[buildId] ?? {};
    store[buildId][key] = value;
    localStorage.setItem(OBTAINED_KEY, JSON.stringify(store));
  } catch {
    // localStorage indisponível (ex.: aba privada) — segue sem persistir
  }
}

function isObtained(buildId: string, key: string): boolean {
  return !!loadObtained()[buildId]?.[key];
}

function resetObtained(buildId: string) {
  try {
    const store = loadObtained();
    delete store[buildId];
    localStorage.setItem(OBTAINED_KEY, JSON.stringify(store));
  } catch {
    // ignora
  }
}

type UpdateOverride = (kind: string, key: string, patch: Record<string, unknown>) => Promise<void>;

const inputStyle = {
  padding: 5,
  background: "var(--panel)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 13,
};

function EssenceRow({
  buildId,
  rawEssence,
  overrides,
  fallbackKey,
  editMode,
  updateOverride,
}: {
  buildId: string;
  rawEssence: ShapeEssence;
  overrides: OverridesStore;
  fallbackKey: string;
  editMode: boolean;
  updateOverride: UpdateOverride;
}) {
  const essence = withOverride(overrides, "item", rawEssence);
  const overrideKey = overrideKeyFor(essence);
  const obtainKey = essence.key || fallbackKey;
  const [showEffect, setShowEffect] = useState(false);
  const [obtained, setObtained] = useState(() => isObtained(buildId, obtainKey));
  const [name, setName] = useState(essence.name);
  const [effect, setEffect] = useState(essence.effect ?? "");

  function toggle() {
    setObtainedFlag(buildId, obtainKey, !obtained);
    setObtained(!obtained);
  }

  if (editMode) {
    return (
      <li style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0" }}>
        <IconOrBadge iconKey={essence.key} kind="item" value={essence.type} explicitPath={essence.icon} rarity={essence.rarity} />
        <div style={{ flex: 1, display: "grid", gap: 6 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== essence.name && updateOverride("item", overrideKey, { name })}
            style={inputStyle}
          />
          <select
            value={essence.rarity ?? ""}
            onChange={(e) => updateOverride("item", overrideKey, { rarity: e.target.value || undefined })}
            style={inputStyle}
          >
            {RARITY_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {RARITY_LABEL[r]}
              </option>
            ))}
          </select>
          <textarea
            value={effect}
            onChange={(e) => setEffect(e.target.value)}
            onBlur={() => effect !== (essence.effect ?? "") && updateOverride("item", overrideKey, { effect: effect || undefined })}
            placeholder="Descrição / efeito..."
            style={{ ...inputStyle, minHeight: 44, fontFamily: "inherit" }}
          />
        </div>
      </li>
    );
  }

  return (
    <li style={{ borderLeft: "3px solid transparent", paddingLeft: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <input type="checkbox" checked={obtained} onChange={toggle} title="Já consegui essa essência nessa run" />
        <IconOrBadge iconKey={essence.key} kind="item" value={essence.type} explicitPath={essence.icon} rarity={essence.rarity} />
        <span style={{ opacity: obtained ? 0.5 : 1, textDecoration: obtained ? "line-through" : "none" }}>
          {abbrevEssence(essence.name)}
        </span>
        {essence.note ? <span className="pill">{String(essence.note)}</span> : null}
        {essence.effect ? (
          <button
            onClick={() => setShowEffect((v) => !v)}
            className="muted"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem" }}
            title="Ver descrição"
          >
            ⓘ
          </button>
        ) : null}
      </div>
      {showEffect && essence.effect ? (
        <p className="muted" style={{ fontSize: 13, margin: "4px 0 0 24px" }}>
          {essence.effect}
        </p>
      ) : null}
    </li>
  );
}

function MemoryCard({
  buildId,
  rawMemory,
  overrides,
  index,
  editMode,
  updateOverride,
}: {
  buildId: string;
  rawMemory: ShapeMemory;
  overrides: OverridesStore;
  index: number;
  editMode: boolean;
  updateOverride: UpdateOverride;
}) {
  const memory = withOverride(overrides, "skill", rawMemory);
  const overrideKey = overrideKeyFor(memory);
  const memKey = memory.key || memory.name;
  const [expanded, setExpanded] = useState(false);
  const [obtained, setObtained] = useState(() => isObtained(buildId, memKey));
  const [name, setName] = useState(memory.name);
  const [effect, setEffect] = useState(memory.effect ?? "");

  function toggle() {
    setObtainedFlag(buildId, memKey, !obtained);
    setObtained(!obtained);
  }

  if (editMode) {
    return (
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconOrBadge iconKey={memory.key} kind="skill" value={memory.type} explicitPath={memory.icon} />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== memory.name && updateOverride("skill", overrideKey, { name })}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
        <textarea
          value={effect}
          onChange={(e) => setEffect(e.target.value)}
          onBlur={() => effect !== (memory.effect ?? "") && updateOverride("skill", overrideKey, { effect: effect || undefined })}
          placeholder="Descrição / efeito..."
          style={{ ...inputStyle, minHeight: 44, marginTop: 8, width: "100%", fontFamily: "inherit" }}
        />
        {rawMemory.essences?.length ? (
          <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "grid", gap: 4 }}>
            {rawMemory.essences.map((e, i) => (
              <EssenceRow
                key={e.key || `${memKey}-${i}`}
                buildId={buildId}
                rawEssence={e}
                overrides={overrides}
                fallbackKey={`${memKey}__${e.name}`}
                editMode={editMode}
                updateOverride={updateOverride}
              />
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={obtained} onChange={toggle} title="Já consegui essa Memory nessa run" />
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            background: "none",
            border: "none",
            color: "inherit",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            textAlign: "left",
            padding: 0,
            fontSize: "1rem",
          }}
        >
          <span className="muted">{index + 1}</span>
          <IconOrBadge iconKey={memory.key} kind="skill" value={memory.type} explicitPath={memory.icon} />
          <span style={{ opacity: obtained ? 0.5 : 1, textDecoration: obtained ? "line-through" : "none" }}>{memory.name}</span>
        </button>
        <span className="muted">{expanded ? "▴" : "▾"}</span>
      </div>
      {expanded && memory.effect ? (
        <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          {memory.effect}
        </p>
      ) : null}
      {rawMemory.essences?.length ? (
        <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "grid", gap: 8 }}>
          {rawMemory.essences.map((e, i) => (
            <EssenceRow
              key={e.key || `${memKey}-${i}`}
              buildId={buildId}
              rawEssence={e}
              overrides={overrides}
              fallbackKey={`${memKey}__${e.name}`}
              editMode={editMode}
              updateOverride={updateOverride}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ConstellationSection({
  traveler,
  overrides,
  editMode,
  updateOverride,
}: {
  traveler: ShapeTraveler;
  overrides: OverridesStore;
  editMode: boolean;
  updateOverride: UpdateOverride;
}) {
  const rawStars = traveler.constellation ?? [];
  const [expanded, setExpanded] = useState(false);
  if (!rawStars.length) return null;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <strong>
          Constelação de {traveler.name} — referência geral ({rawStars.length} estrelas)
        </strong>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="pill"
          style={{ cursor: "pointer", border: "1px solid var(--border)", background: "none" }}
        >
          {expanded || editMode ? "Mostrar menos ▴" : "Ver todas as estrelas ▾"}
        </button>
      </div>
      {expanded || editMode ? (
        <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "grid", gap: 8 }}>
          {rawStars.map((rawS, i) => {
            const s = withOverride(overrides, "star", rawS);
            const sKey = overrideKeyFor(s);
            if (editMode) {
              return (
                <li key={sKey || i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <IconOrBadge iconKey={s.key} kind="star" value={s.category} explicitPath={s.icon} />
                  <div style={{ flex: 1, display: "grid", gap: 6 }}>
                    <input
                      defaultValue={s.name}
                      onBlur={(e) => e.target.value.trim() && e.target.value !== s.name && updateOverride("star", sKey, { name: e.target.value })}
                      style={inputStyle}
                    />
                    <select
                      value={s.category ?? ""}
                      onChange={(e) => updateOverride("star", sKey, { category: e.target.value })}
                      style={inputStyle}
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABEL[c]}
                        </option>
                      ))}
                    </select>
                    <textarea
                      defaultValue={s.effect ?? ""}
                      onBlur={(e) => e.target.value !== (s.effect ?? "") && updateOverride("star", sKey, { effect: e.target.value || undefined })}
                      placeholder="Descrição / efeito..."
                      style={{ ...inputStyle, minHeight: 40, fontFamily: "inherit" }}
                    />
                  </div>
                </li>
              );
            }
            return (
              <li key={sKey || i} style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                <IconOrBadge iconKey={s.key} kind="star" value={s.category} explicitPath={s.icon} />
                {s.category ? <span className="pill">{CATEGORY_LABEL[s.category] ?? s.category}</span> : null}
                <span style={{ fontWeight: 600 }}>{s.name}</span>
                {s.effect ? (
                  <span className="muted" style={{ fontSize: 13 }}>
                    {s.effect}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {traveler._constellation_note ? (
        <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          {traveler._constellation_note}
        </p>
      ) : null}
    </div>
  );
}

export default function ShapeBuildView({
  traveler,
  build,
  overrides,
  updateOverride,
}: {
  traveler: ShapeTraveler;
  build: ShapeBuild;
  overrides: OverridesStore;
  updateOverride: UpdateOverride;
}) {
  const [editMode, setEditMode] = useState(false);
  const [resetCounter, setResetCounter] = useState(0);

  return (
    <div>
      <div className="muted" style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {build.season ? <span>{build.season}</span> : null}
        {build.date ? <span>{build.date}</span> : null}
        <span title="Número ilustrativo — não puxa dados reais do site da comunidade">👍 {build.likes ?? 0}</span>
        <span title="Número ilustrativo — não puxa dados reais do site da comunidade">👁 {build.views ?? 0}</span>
      </div>

      {build.memories?.length ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <h4 style={{ margin: 0 }}>Memories e Essências</h4>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="pill" style={{ cursor: "pointer", border: "1px solid var(--border)", background: editMode ? "var(--accent)" : "none", color: editMode ? "#101014" : "var(--accent)" }} onClick={() => setEditMode((v) => !v)}>
                ✏️ {editMode ? "Concluir edição" : "Editar"}
              </button>
              <button
                className="pill"
                style={{ cursor: "pointer", border: "1px solid var(--border)", background: "none" }}
                onClick={() => {
                  resetObtained(build.id);
                  setResetCounter((n) => n + 1);
                }}
              >
                ↺ Resetar marcados
              </button>
            </div>
          </div>
          {build.memories.map((m, i) => (
            <MemoryCard
              key={`${resetCounter}-${m.key || i}`}
              buildId={build.id}
              rawMemory={m}
              overrides={overrides}
              index={i}
              editMode={editMode}
              updateOverride={updateOverride}
            />
          ))}
        </>
      ) : (
        <p className="muted">Nenhuma memory cadastrada ainda pra essa build.</p>
      )}

      <ConstellationSection traveler={traveler} overrides={overrides} editMode={editMode} updateOverride={updateOverride} />

      {build.notes ? (
        <p className="muted" style={{ marginTop: 16 }}>
          {build.notes}
        </p>
      ) : null}
    </div>
  );
}
