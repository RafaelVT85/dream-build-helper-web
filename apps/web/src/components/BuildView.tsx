import type { AnyBuild } from "../../../packages/data-schema/types";

// Exibição legível de uma build, sem depender de um schema normalizado
// (os dados ainda vêm no formato "solto" documentado em
// packages/data-schema/types.ts). Em vez de despejar JSON cru, isto
// organiza os campos conhecidos (equipamento, skill bar, paragon, prós/
// contras, etc.) em seções, e qualquer campo que não reconheça ainda
// aparece no fim, para nunca esconder informação da build.

const FIELD_LABELS: Record<string, string> = {
  skill_progression: "Progressão de habilidades",
  skill_bar: "Barra de habilidades",
  enchantment_slot_1: "Encantamento (slot 1)",
  enchantment_slot_2: "Encantamento (slot 2)",
  enchantments: "Encantamentos",
  glyph_priority: "Prioridade de glifos",
  splinters_good: "Splinters recomendados",
  splinters_avoid: "Splinters a evitar",
  splinters: "Splinters",
  uniques_useful: "Únicos úteis",
  equipment: "Equipamento",
  equipment_notes: "Observações sobre equipamento",
  mercenary: "Mercenário",
  paragon: "Paragon",
  pros: "Prós",
  cons: "Contras",
  total_points: "Total de pontos",
  main_set: "Conjunto principal",
  key_unique: "Único-chave",
  key_mythic: "Mítico-chave",
  mythic_priority: "Prioridade de míticos",
  runes_note: "Observação sobre runas",
  planner_url: "Planner",
  planner_url_note: "Observação sobre o planner",
  source: "Fonte",
  source_gap_fill: "Fonte (dados complementares)",
};

const HIDDEN_FIELDS = new Set(["id", "name", "phase", "status", "tier"]);

function label(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, " ");
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function ValueView({ value }: { value: unknown }) {
  if (isEmpty(value)) return <span className="muted">—</span>;

  if (Array.isArray(value)) {
    return (
      <ul style={{ margin: "4px 0", paddingLeft: 20 }}>
        {value.map((item, i) => (
          <li key={i}>
            {typeof item === "object" && item !== null ? <ValueView value={item} /> : String(item)}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <div style={{ display: "grid", gap: 4, marginTop: 4 }}>
        {entries.map(([k, v]) => (
          <div key={k}>
            <strong>{label(k)}:</strong> <ValueView value={v} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "string" && /^https?:\/\//.test(value)) {
    return (
      <a href={value} target="_blank" rel="noreferrer">
        {value}
      </a>
    );
  }

  return <>{String(value)}</>;
}

function Section({ title, value }: { title: string; value: unknown }) {
  if (isEmpty(value)) return null;
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h4 style={{ margin: "0 0 8px" }}>{title}</h4>
      <ValueView value={value} />
    </div>
  );
}

// Ordem preferida de exibição — o que sobrar (campos desconhecidos) entra
// depois, então nada fica escondido mesmo que o schema mude.
const PREFERRED_ORDER = [
  "main_set",
  "key_unique",
  "key_mythic",
  "equipment",
  "equipment_notes",
  "skill_bar",
  "skill_progression",
  "total_points",
  "enchantment_slot_1",
  "enchantment_slot_2",
  "enchantments",
  "glyph_priority",
  "paragon",
  "mythic_priority",
  "splinters",
  "splinters_good",
  "splinters_avoid",
  "uniques_useful",
  "runes_note",
  "mercenary",
  "pros",
  "cons",
];

export default function BuildView({ build }: { build: AnyBuild }) {
  const known = new Set([...PREFERRED_ORDER, ...HIDDEN_FIELDS, "source", "source_gap_fill", "planner_url", "planner_url_note"]);
  const rest = Object.keys(build).filter((k) => !known.has(k));

  return (
    <div>
      {PREFERRED_ORDER.map((key) =>
        key in build ? <Section key={key} title={label(key)} value={build[key]} /> : null
      )}
      {rest.map((key) => (
        <Section key={key} title={label(key)} value={build[key]} />
      ))}
      {(build.planner_url || build.planner_url_note) && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h4 style={{ margin: "0 0 8px" }}>Planner</h4>
          {build.planner_url ? (
            <a href={String(build.planner_url)} target="_blank" rel="noreferrer">
              {String(build.planner_url)}
            </a>
          ) : (
            <span className="muted">{String(build.planner_url_note ?? "Sem planner disponível")}</span>
          )}
        </div>
      )}
      {(build.source || build.source_gap_fill) && (
        <p className="muted" style={{ fontSize: 13 }}>
          Fonte: {build.source ? <ValueView value={build.source} /> : null}
          {build.source_gap_fill ? (
            <>
              {" "}
              · Complementos: <ValueView value={build.source_gap_fill} />
            </>
          ) : null}
        </p>
      )}
    </div>
  );
}
