// Peças visuais compartilhadas do Shape of Dreams: ícone real (com fallback
// pro selo colorido quando a imagem não existe/falha) e avatar de traveler
// (com fallback pra inicial colorida). Porta fiel de iconOrBadge/travelerAvatar
// do public/app.js antigo.

import { useState } from "react";
import { relIconPath, resolveIconSrc, colorFor } from "../lib/shapeOverrides";

export const RARITY_COLORS: Record<string, string> = {
  common: "#d7d7e0",
  rare: "#5cc8ff",
  epic: "#b389ff",
  legendary: "#e0556b",
  unique: "#f0a63c",
};

export const CATEGORY_LABEL: Record<string, string> = {
  destruicao: "Destruição",
  vida: "Vida",
  imaginacao: "Imaginação",
  flexivel: "Flexível",
};

const TYPE_BADGES: Record<string, { emoji: string; color: string }> = {
  fire: { emoji: "🔥", color: "#f0a63c" },
  ice: { emoji: "❄️", color: "#7ecbff" },
  light: { emoji: "✨", color: "#ffe27a" },
  dark: { emoji: "🌑", color: "#b389ff" },
  nature: { emoji: "🌿", color: "#7ed77e" },
  physical: { emoji: "⚔️", color: "#d7d7e0" },
  heal: { emoji: "💗", color: "#ff8fb3" },
  neutral: { emoji: "⚪", color: "#9c99b8" },
};

const CONSTELLATION_BADGES: Record<string, { emoji: string; color: string; label: string }> = {
  destruicao: { emoji: "💥", color: "#e0556b", label: "Destruição" },
  vida: { emoji: "💚", color: "#4ade80", label: "Vida" },
  imaginacao: { emoji: "🔷", color: "#5cc8ff", label: "Imaginação" },
  flexivel: { emoji: "🔶", color: "#f0a63c", label: "Flexível" },
};

export function TypeBadge({ type }: { type?: string }) {
  const t = (type && TYPE_BADGES[type]) || TYPE_BADGES.neutral;
  return (
    <span className="type-badge" style={{ background: `${t.color}22`, borderColor: `${t.color}66` }}>
      {t.emoji}
    </span>
  );
}

export function ConstellationBadge({ category }: { category?: string }) {
  const c = (category && CONSTELLATION_BADGES[category]) || { emoji: "⭐", color: "#9c99b8", label: category || "" };
  return (
    <span className="type-badge" title={c.label} style={{ background: `${c.color}22`, borderColor: `${c.color}66` }}>
      {c.emoji}
    </span>
  );
}

// Ícone de verdade quando existe (upload da Galeria ou arquivo local em
// src/data/icons/); cai pro selo colorido se não tiver imagem ou se ela falhar
// ao carregar — nunca quebra a tela por causa de um ícone faltando.
export function IconOrBadge({
  iconKey,
  kind,
  value,
  explicitPath,
  rarity,
}: {
  iconKey?: string;
  kind: "skill" | "item" | "star";
  value?: string;
  explicitPath?: string;
  rarity?: string;
}) {
  const [errored, setErrored] = useState(false);
  const rarityColor = rarity ? RARITY_COLORS[rarity] : undefined;
  const src = explicitPath ? resolveIconSrc(explicitPath) : iconKey ? `/data/icons/${relIconPath(kind, iconKey, value)}` : null;

  if (!src || errored) {
    return kind === "star" ? <ConstellationBadge category={value} /> : <TypeBadge type={value} />;
  }
  return (
    <img
      src={src}
      alt=""
      className="type-icon"
      style={rarityColor ? { borderColor: rarityColor, boxShadow: `0 0 4px ${rarityColor}88` } : undefined}
      title={rarity}
      onError={() => setErrored(true)}
    />
  );
}

export function TravelerAvatar({ traveler }: { traveler: { id: string; name: string; icon?: string } }) {
  const [errored, setErrored] = useState(false);
  const src = traveler.icon ? resolveIconSrc(traveler.icon) : `/data/icons/${relIconPath("traveler", traveler.id)}`;

  if (errored) {
    return (
      <div className="avatar-fallback" style={{ background: colorFor(traveler.id) }}>
        {(traveler.name || "?").charAt(0).toUpperCase()}
      </div>
    );
  }
  return <img src={src} alt="" className="avatar-img" onError={() => setErrored(true)} />;
}
