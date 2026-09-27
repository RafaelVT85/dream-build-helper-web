import { useState } from "react";
import type { ShapeBuild, ShapeEssence, ShapeMemory, ShapeTraveler } from "../../../../packages/data-schema/types";

// Exibição de uma build no schema do Shape of Dreams (memories/essences/
// constelação) — bem diferente do schema leveling_builds/endgame_builds do
// Diablo (ver BuildView.tsx pra esse outro caso). Porta a lógica visual do
// public/app.js antigo (memórias expansíveis, essências marcáveis como
// "já consegui", constelação recolhida por padrão) pro React, sem alterar
// os dados que o Rafael já editou manualmente (galeria/ícones ficam de fora
// desta primeira versão — só a leitura/visualização volta a funcionar).

const RARITY_COLORS: Record<string, string> = {
  common: "#d7d7e0",
  rare: "#5cc8ff",
  epic: "#b389ff",
  legendary: "#e0556b",
  unique: "#f0a63c",
};

const CATEGORY_LABEL: Record<string, string> = {
  destruicao: "Destruição",
  vida: "Vida",
  imaginacao: "Imaginação",
  flexivel: "Flexível",
};

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

function EssenceRow({
  buildId,
  essence,
  fallbackKey,
}: {
  buildId: string;
  essence: ShapeEssence;
  fallbackKey: string;
}) {
  const key = essence.key || fallbackKey;
  const [showEffect, setShowEffect] = useState(false);
  const [obtained, setObtained] = useState(() => isObtained(buildId, key));
  const rarityColor = essence.rarity ? RARITY_COLORS[essence.rarity] : undefined;

  function toggle() {
    setObtainedFlag(buildId, key, !obtained);
    setObtained(!obtained);
  }

  return (
    <li style={{ borderLeft: rarityColor ? `3px solid ${rarityColor}` : "3px solid transparent", paddingLeft: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <input type="checkbox" checked={obtained} onChange={toggle} title="Já consegui essa essência nessa run" />
        <span style={{ opacity: obtained ? 0.5 : 1, textDecoration: obtained ? "line-through" : "none" }}>
          {abbrevEssence(essence.name)}
        </span>
        {essence.note ? <span className="pill">{essence.note}</span> : null}
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

function MemoryCard({ buildId, memory, index }: { buildId: string; memory: ShapeMemory; index: number }) {
  const memKey = memory.key || memory.name;
  const [expanded, setExpanded] = useState(false);
  const [obtained, setObtained] = useState(() => isObtained(buildId, memKey));

  function toggle() {
    setObtainedFlag(buildId, memKey, !obtained);
    setObtained(!obtained);
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
          <span style={{ opacity: obtained ? 0.5 : 1, textDecoration: obtained ? "line-through" : "none" }}>
            {memory.name}
          </span>
        </button>
        <span className="muted">{expanded ? "▴" : "▾"}</span>
      </div>
      {expanded && memory.effect ? (
        <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          {memory.effect}
        </p>
      ) : null}
      {memory.essences?.length ? (
        <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "grid", gap: 8 }}>
          {memory.essences.map((e, i) => (
            <EssenceRow key={e.key || `${memKey}-${i}`} buildId={buildId} essence={e} fallbackKey={`${memKey}__${e.name}`} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ConstellationSection({ traveler }: { traveler: ShapeTraveler }) {
  const stars = traveler.constellation ?? [];
  const [expanded, setExpanded] = useState(false);
  if (!stars.length) return null;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <strong>
          Constelação de {traveler.name} — referência geral ({stars.length} estrelas)
        </strong>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="pill"
          style={{ cursor: "pointer", border: "1px solid var(--border)", background: "none" }}
        >
          {expanded ? "Mostrar menos ▴" : "Ver todas as estrelas ▾"}
        </button>
      </div>
      {expanded ? (
        <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "grid", gap: 8 }}>
          {stars.map((s, i) => (
            <li key={s.key || i} style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
              {s.category ? <span className="pill">{CATEGORY_LABEL[s.category] ?? s.category}</span> : null}
              <span style={{ fontWeight: 600 }}>{s.name}</span>
              {s.effect ? (
                <span className="muted" style={{ fontSize: 13 }}>
                  {s.effect}
                </span>
              ) : null}
            </li>
          ))}
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

export default function ShapeBuildView({ traveler, build }: { traveler: ShapeTraveler; build: ShapeBuild }) {
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
          <h4 style={{ margin: "0 0 8px" }}>Memories e Essências</h4>
          {build.memories.map((m, i) => (
            <MemoryCard key={m.key || i} buildId={build.id} memory={m} index={i} />
          ))}
        </>
      ) : (
        <p className="muted">Nenhuma memory cadastrada ainda pra essa build.</p>
      )}

      <ConstellationSection traveler={traveler} />

      {build.notes ? (
        <p className="muted" style={{ marginTop: 16 }}>
          {build.notes}
        </p>
      ) : null}
    </div>
  );
}
