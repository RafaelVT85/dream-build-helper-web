import { useState } from "react";
import { THEME_OPTIONS, useAppearance } from "../lib/shapeUiPrefs";

// Botão de engrenagem no header que abre um popover com o slider de
// transparência e o seletor de tema — porta a ideia da "Aparência" do site
// antigo (public/app.js), simplificada pra 4 presets de cor em vez do sistema
// de skins completo do legado.
export default function AppearancePanel() {
  const { appearance, setAppearance } = useAppearance();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        className="pill"
        style={{ cursor: "pointer", border: "1px solid var(--border)", background: "transparent", color: "var(--accent)" }}
        onClick={() => setOpen((v) => !v)}
        title="Aparência"
      >
        ⚙️ Aparência
      </button>
      {open ? (
        <div
          className="card"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 240,
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div>
            <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 4 }}>
              Transparência do fundo ({appearance.bgAlpha}%)
            </label>
            <input
              type="range"
              min={30}
              max={100}
              value={appearance.bgAlpha}
              onChange={(e) => setAppearance({ ...appearance, bgAlpha: Number(e.target.value) })}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, color: "var(--muted)", display: "block", marginBottom: 4 }}>Tema</label>
            <select
              value={appearance.theme}
              onChange={(e) => setAppearance({ ...appearance, theme: e.target.value })}
              style={{
                width: "100%",
                background: "var(--bg)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "6px 8px",
              }}
            >
              {THEME_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </div>
  );
}
