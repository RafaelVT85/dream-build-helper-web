import { useState } from "react";
import type { SaveResult, SaveStatus } from "../lib/shapeOverrides";

const hhmm = (t: number) => new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

// Barra fixa no rodapé das telas de edição: mostra se as alterações já foram
// salvas e tem o botão Salvar, que envia o que faltar e confere no servidor.
export default function SaveBar({ status, onSave }: { status: SaveStatus; onSave: () => Promise<SaveResult> }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);

  async function handleSave() {
    setBusy(true);
    setResult(null);
    try {
      setResult(await onSave());
    } finally {
      setBusy(false);
    }
  }

  let text: string;
  let color = "var(--muted)";
  if (result && status.pending === 0 && !busy) {
    text = (result.ok ? "✅ " : "⚠️ ") + result.message;
    color = result.ok ? "#4ade80" : "#ff6b6b";
  } else if (status.failed) {
    text = `⚠️ ${status.pending} alteração(ões) não salva(s): ${status.failed}`;
    color = "#ff6b6b";
  } else if (busy || status.saving || status.pending > 0) {
    text = "⏳ Salvando…";
  } else if (status.lastVerifiedAt) {
    text = `✅ Conferido no servidor às ${hhmm(status.lastVerifiedAt)}`;
    color = "#4ade80";
  } else if (status.lastSavedAt) {
    text = `✓ Salvo às ${hhmm(status.lastSavedAt)} — clique em Salvar para conferir`;
  } else {
    text = "As alterações são salvas automaticamente. Clique em Salvar para ter certeza.";
  }

  return (
    <div
      role="status"
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 55,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        padding: "10px 16px",
        background: "var(--panel)",
        borderTop: "1px solid var(--border)",
      }}
    >
      <span style={{ color, fontSize: 14, flex: 1, minWidth: 200 }}>{text}</span>
      <button
        className="pill"
        disabled={busy}
        onClick={handleSave}
        style={{ cursor: busy ? "wait" : "pointer", border: "1px solid var(--accent)", background: "var(--accent)", color: "#101014", fontWeight: 700, fontSize: 14, padding: "6px 16px" }}
      >
        💾 {busy ? "Salvando…" : status.failed ? "Tentar de novo" : "Salvar"}
      </button>
    </div>
  );
}
