// Dream Build Helper — v4 (visual: avatares de personagem + cards de build)
// Estado persistido no localStorage do próprio app (não sai da máquina do usuário).

const STORAGE_KEY = "dream-build-helper:state";
const MAX_HISTORY = 15;

const TYPE_BADGES = {
  fire:     { emoji: "🔥", color: "#f0a63c" },
  ice:      { emoji: "❄️", color: "#7ecbff" },
  light:    { emoji: "✨", color: "#ffe27a" },
  dark:     { emoji: "🌑", color: "#b389ff" },
  nature:   { emoji: "🌿", color: "#7ed77e" },
  physical: { emoji: "⚔️", color: "#d7d7e0" },
  heal:     { emoji: "💗", color: "#ff8fb3" },
  neutral:  { emoji: "⚪", color: "#9c99b8" },
};

function typeBadge(type) {
  const t = TYPE_BADGES[type] || TYPE_BADGES.neutral;
  return `<span class="type-badge" style="background:${t.color}22;border-color:${t.color}66;">${t.emoji}</span>`;
}

const CONSTELLATION_BADGES = {
  destruicao: { emoji: "💥", color: "#e0556b", label: "Destruição" },
  vida:       { emoji: "💚", color: "#4ade80", label: "Vida" },
  imaginacao: { emoji: "🔷", color: "#5cc8ff", label: "Imaginação" },
  flexivel:   { emoji: "🔶", color: "#f0a63c", label: "Flexível" },
};

function constellationBadge(category) {
  const c = CONSTELLATION_BADGES[category] || { emoji: "⭐", color: "#9c99b8", label: category || "" };
  return `<span class="type-badge" title="${escapeHtml(c.label)}" style="background:${c.color}22;border-color:${c.color}66;">${c.emoji}</span>`;
}

// Cor estável (baseada no texto) pra usar de fundo no avatar quando não há imagem.
const AVATAR_COLORS = ["#7c6cf0", "#e0556b", "#4ade80", "#f0a63c", "#5cc8ff", "#ff8fb3", "#b389ff", "#7ed77e"];
function colorFor(text) {
  let hash = 0;
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// Ícones locais: opcional, cole seus próprios PNGs dentro de src/data/icons/
// (memorias/, essencias/, memorias/<categoria>/, travelers/) — veja src/data/icons/LEIA-ME.md.
// Se o arquivo não existir, cai pro selo colorido / avatar de iniciais; nada quebra.
function relIconPath(kind, key, value) {
  if (kind === "skill") return `memorias/${key}.png`;
  if (kind === "item") return `essencias/${key}.png`;
  if (kind === "star") return `memorias/${value}/${key}.png`; // value = categoria
  if (kind === "traveler") return `travelers/${key}.png`;
  if (kind === "game") return `covers/${key}.png`;
  return `${key}.png`;
}

function resolveIconSrc(explicitPath) {
  // Uploads pela Galeria salvam uma URL completa do Vercel Blob; os ícones
  // que já vieram prontos no site são caminho relativo dentro de data/icons/.
  if (/^https?:\/\//i.test(explicitPath)) return explicitPath;
  return `data/icons/${encodeURI(explicitPath)}`;
}

function iconOrBadge(key, kind, value, explicitPath, rarity) {
  const rarityStyle = rarity && RARITY_COLORS[rarity]
    ? ` style="border-color:${RARITY_COLORS[rarity]};box-shadow:0 0 4px ${RARITY_COLORS[rarity]}88;" title="${escapeHtml(rarity)}"`
    : "";
  if (explicitPath) {
    return `<img src="${resolveIconSrc(explicitPath)}" alt="" class="type-icon"${rarityStyle} data-kind="${kind}" data-value="${escapeHtml(value || "")}">`;
  }
  if (!key) return kind === "star" ? constellationBadge(value) : typeBadge(value);
  const path = `data/icons/${relIconPath(kind, key, value)}`;
  return `<img src="${path}" alt="" class="type-icon"${rarityStyle} data-kind="${kind}" data-value="${escapeHtml(value || "")}">`;
}

function travelerAvatar(rawTraveler) {
  const traveler = withOverride("traveler", rawTraveler);
  const path = traveler.icon ? resolveIconSrc(traveler.icon) : `data/icons/${relIconPath("traveler", traveler.id)}`;
  const initial = escapeHtml((traveler.name || "?").charAt(0).toUpperCase());
  return `<img src="${path}" alt="" class="avatar-img" data-kind="traveler-avatar" data-initial="${initial}" data-color="${colorFor(traveler.id)}">`;
}

function wireIconFallbacks(container) {
  container.querySelectorAll(".type-icon").forEach(img => {
    img.addEventListener("error", () => {
      const badge = img.dataset.kind === "star" ? constellationBadge(img.dataset.value) : typeBadge(img.dataset.value);
      img.outerHTML = badge;
    }, { once: true });
  });
  container.querySelectorAll('.avatar-img[data-kind="traveler-avatar"]').forEach(img => {
    img.addEventListener("error", () => {
      const div = document.createElement("div");
      div.className = "avatar-fallback";
      div.style.background = img.dataset.color;
      div.textContent = img.dataset.initial;
      img.replaceWith(div);
    }, { once: true });
  });
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

// ---------- Edições do usuário (nome/descrição/raridade/ícone) ----------
// Ficam salvas no servidor (Vercel Blob) via /api/*, então aparecem pra
// qualquer visitante do site, não só no seu navegador.

let overridesStore = { skill: {}, item: {}, star: {}, game: {} };
let overridesLoaded = false;

async function fetchOverrides() {
  try {
    const res = await fetch("/api/get-overrides");
    if (res.ok) overridesStore = await res.json();
  } catch {
    // sem internet/servidor fora do ar: segue só com os dados estáticos
  } finally {
    overridesLoaded = true;
  }
}

function getOverride(kind, key) {
  return (overridesStore[kind] && key && overridesStore[kind][key]) || {};
}
async function setOverride(kind, key, patch) {
  if (!key) return;
  // Otimista: já atualiza na hora, e manda pro servidor em paralelo.
  overridesStore[kind] = overridesStore[kind] || {};
  overridesStore[kind][key] = { ...getOverride(kind, key), ...patch };
  try {
    await postJson("/api/save-override", { kind, key, patch });
  } catch (err) {
    alert("Não consegui salvar no servidor (fica só nessa sessão): " + err.message);
  }
}
// Devolve uma cópia do item com as edições já aplicadas por cima.
// Cadeia de fallback única pra achar a "chave" de qualquer item: a maioria
// usa `key`, personagens usam `id`, e o raríssimo item sem nenhum dos dois
// (ex.: a skill "Déjà Vu inicial") cai pro próprio nome.
function overrideKeyFor(item) {
  return item.key || item.id || item.name;
}

function withOverride(kind, item) {
  return { ...item, ...getOverride(kind, overrideKeyFor(item)) };
}

const RARITY_COLORS = {
  common: "#d7d7e0",
  rare: "#5cc8ff",
  epic: "#b389ff",
  legendary: "#e0556b",
  unique: "#f0a63c",
};

function rarityDot(rarity) {
  if (!rarity || !RARITY_COLORS[rarity]) return "";
  return `<span class="rarity-dot" style="background:${RARITY_COLORS[rarity]}" title="${escapeHtml(rarity)}"></span>`;
}

// Abrevia "Essência de/da/do X" pra "Es. X", só pra exibição.
function abbrevEssence(name) {
  return name.replace(/^Essência (de|da|do) /, "Es. ");
}

// ---------- Marcar o que já foi conseguido na run atual ----------

const OBTAINED_KEY = "dream-build-helper:obtained";
let obtainedStore = loadObtained();

function loadObtained() {
  try { return JSON.parse(localStorage.getItem(OBTAINED_KEY)) || {}; }
  catch { return {}; }
}
function saveObtained() {
  localStorage.setItem(OBTAINED_KEY, JSON.stringify(obtainedStore));
}
function isObtained(buildId, key) {
  return !!(obtainedStore[buildId] && obtainedStore[buildId][key]);
}
function toggleObtained(buildId, key, checked) {
  obtainedStore[buildId] = obtainedStore[buildId] || {};
  obtainedStore[buildId][key] = checked;
  saveObtained();
}
function resetObtained(buildId) {
  delete obtainedStore[buildId];
  saveObtained();
}

const state = loadState();
let gamesIndex = [];
let currentGameData = null;
let currentTravelerId = null;
let currentBuildId = null;
let currentSort = "likes";

const el = {
  gameHome: document.getElementById("gameHome"),
  gameView: document.getElementById("gameView"),
  gameGrid: document.getElementById("gameGrid"),
  btnChangeGame: document.getElementById("btnChangeGame"),
  currentGameName: document.getElementById("currentGameName"),
  travelerList: document.getElementById("travelerList"),
  buildList: document.getElementById("buildList"),
  buildListTitle: document.getElementById("buildListTitle"),
  buildDetails: document.getElementById("buildDetails"),
  savesList: document.getElementById("savesList"),
  btnBack: document.getElementById("btnBack"),
  btnSaveState: document.getElementById("btnSaveState"),
  sortBtns: document.querySelectorAll(".sortBtn"),
};

// ---------- Galeria de ícones (ver o que falta, enviar imagem) ----------

const galleryEl = {
  toggleBtn: document.getElementById("btnToggleGallery"),
  mainView: document.getElementById("mainView"),
  galleryView: document.getElementById("galleryView"),
  travelersGrid: document.getElementById("galleryTravelersGrid"),
  skillsGrid: document.getElementById("gallerySkillsGrid"),
  essencesGrid: document.getElementById("galleryEssencesGrid"),
  starsGrid: document.getElementById("galleryStarsGrid"),
  filterBtns: document.querySelectorAll(".galleryFilterBtn"),
};
let galleryFilter = "missing";
let galleryOpen = false;

function collectGalleryItems() {
  const skills = new Map();
  const essences = new Map();
  const stars = new Map();
  const travelers = [];

  (currentGameData?.travelers || []).forEach(t => {
    travelers.push({ id: t.id, name: t.name, icon: t.icon });
    (t.builds || []).forEach(b => {
      (b.memories || []).forEach(rawM => {
        const k = overrideKeyFor(rawM);
        if (!skills.has(k)) skills.set(k, withOverride("skill", { key: rawM.key, name: rawM.name, type: rawM.type, effect: rawM.effect, icon: rawM.icon }));
        (rawM.essences || []).forEach(rawE => {
          const ek = overrideKeyFor(rawE);
          if (!essences.has(ek)) essences.set(ek, withOverride("item", { key: rawE.key, name: rawE.name, type: rawE.type, rarity: rawE.rarity, effect: rawE.effect, icon: rawE.icon }));
        });
      });
    });
    (t.constellation || []).forEach(rawS => {
      const sk = overrideKeyFor(rawS);
      if (!stars.has(sk)) stars.set(sk, withOverride("star", { key: rawS.key, name: rawS.name, category: rawS.category, effect: rawS.effect, icon: rawS.icon }));
    });
  });

  return {
    travelers,
    skills: [...skills.values()].sort((a, b) => a.name.localeCompare(b.name)),
    essences: [...essences.values()].sort((a, b) => a.name.localeCompare(b.name)),
    stars: [...stars.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

const RARITY_OPTIONS = ["", "common", "rare", "epic", "legendary", "unique"];
const RARITY_LABEL = { "": "— sem raridade —", common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary", unique: "Unique" };
const CATEGORY_OPTIONS = ["destruicao", "vida", "imaginacao", "flexivel"];
const CATEGORY_LABEL = { destruicao: "Destruição", vida: "Vida", imaginacao: "Imaginação", flexivel: "Flexível" };

function galleryCardHtml(kind, item) {
  const displayName = kind === "item" ? abbrevEssence(item.name) : item.name;
  const overrideKey = overrideKeyFor(item);
  const iconHtml = kind === "traveler"
    ? travelerAvatar(item)
    : iconOrBadge(item.key, kind, kind === "star" ? item.category : item.type, item.icon, item.rarity);
  const uid = `gal-${kind}-${overrideKey.replace(/[^a-zA-Z0-9]/g, "_")}`;

  if (kind === "traveler") {
    return `
      <div class="gallery-card" data-has-icon="${item.icon ? "1" : "0"}">
        <div class="gallery-card-icon">${iconHtml}</div>
        <span class="gallery-card-name">${escapeHtml(displayName)}</span>
        <label class="gallery-upload-btn" for="${uid}">${item.icon ? "Trocar" : "Enviar imagem"}</label>
        <input type="file" id="${uid}" accept="image/*" class="gallery-file-input"
          data-kind="${kind}" data-key="${escapeHtml(overrideKey)}" data-value="">
      </div>`;
  }

  let tierField = "";
  if (kind === "item") {
    tierField = `<select class="gallery-edit-select" data-field="rarity" data-kind="${kind}" data-key="${escapeHtml(overrideKey)}">
      ${RARITY_OPTIONS.map(r => `<option value="${r}" ${item.rarity === r ? "selected" : ""}>${RARITY_LABEL[r]}</option>`).join("")}
    </select>`;
  } else if (kind === "star") {
    tierField = `<select class="gallery-edit-select" data-field="category" data-kind="${kind}" data-key="${escapeHtml(overrideKey)}">
      ${CATEGORY_OPTIONS.map(c => `<option value="${c}" ${item.category === c ? "selected" : ""}>${CATEGORY_LABEL[c]}</option>`).join("")}
    </select>`;
  }

  return `
    <div class="gallery-row" data-has-icon="${item.icon ? "1" : "0"}">
      <div class="gallery-row-icon">${iconHtml}</div>
      <div class="gallery-row-fields">
        <input type="text" class="gallery-edit-input gallery-edit-name" data-field="name" data-kind="${kind}" data-key="${escapeHtml(overrideKey)}" value="${escapeHtml(item.name)}">
        ${tierField}
        <textarea class="gallery-edit-textarea" data-field="effect" data-kind="${kind}" data-key="${escapeHtml(overrideKey)}" placeholder="Descrição / efeito...">${escapeHtml(item.effect || "")}</textarea>
      </div>
      <div class="gallery-row-actions">
        <label class="gallery-upload-btn" for="${uid}">${item.icon ? "Trocar imagem" : "Enviar imagem"}</label>
        <input type="file" id="${uid}" accept="image/*" class="gallery-file-input"
          data-kind="${kind}" data-key="${escapeHtml(overrideKey)}" data-value="${escapeHtml(kind === "star" ? (item.category || "") : (item.type || ""))}">
      </div>
    </div>`;
}

function renderGallery() {
  const data = collectGalleryItems();
  const showAll = galleryFilter === "all";

  const render = (grid, kind, items) => {
    const filtered = showAll ? items : items.filter(i => !i.icon);
    grid.innerHTML = filtered.length
      ? filtered.map(i => galleryCardHtml(kind, i)).join("")
      : `<p class="empty-hint">${showAll ? "Nada aqui ainda." : "Tudo com ícone! 🎉"}</p>`;
  };

  render(galleryEl.travelersGrid, "traveler", data.travelers);
  render(galleryEl.skillsGrid, "skill", data.skills);
  render(galleryEl.essencesGrid, "item", data.essences);
  render(galleryEl.starsGrid, "star", data.stars);

  wireIconFallbacks(document.getElementById("galleryView"));

  document.querySelectorAll(".gallery-file-input").forEach(input => {
    input.addEventListener("change", onGalleryFileChosen);
  });
  document.querySelectorAll(".gallery-edit-input, .gallery-edit-textarea").forEach(el => {
    el.addEventListener("change", onGalleryFieldEdited);
  });
  document.querySelectorAll(".gallery-edit-select").forEach(el => {
    el.addEventListener("change", onGalleryFieldEdited);
  });
}

function onGalleryFieldEdited(ev) {
  const el = ev.target;
  const { kind, field, key } = el.dataset;
  if (!key) return;
  const value = el.value.trim();
  setOverride(kind, key, { [field]: value || undefined });
  // Se a build atual mostra esse item, atualiza a tela na hora.
  renderBuildDetails();
}

async function onGalleryFileChosen(ev) {
  const input = ev.target;
  const file = input.files[0];
  if (!file) return;

  const card = input.closest(".gallery-card, .gallery-row, .game-card");
  const label = card.querySelector(".gallery-upload-btn");
  const originalText = label.textContent;
  label.textContent = "Enviando...";

  try {
    const base64 = await fileToBase64(file);
    const relPath = relIconPath(input.dataset.kind, input.dataset.key, input.dataset.value);
    const result = await postJson("/api/upload-icon", {
      kind: input.dataset.kind,
      key: input.dataset.key,
      relPath,
      dataBase64: base64,
      contentType: file.type || "image/png",
    });
    // já aplica na hora, sem esperar recarregar do servidor
    if (input.dataset.kind && input.dataset.key) {
      overridesStore[input.dataset.kind] = overridesStore[input.dataset.kind] || {};
      overridesStore[input.dataset.kind][input.dataset.key] = {
        ...getOverride(input.dataset.kind, input.dataset.key),
        icon: result.url,
      };
    }
    label.textContent = "Salvo ✓";
    setTimeout(() => (input.dataset.kind === "game" ? renderGameHome() : renderGallery()), 500);
  } catch (err) {
    alert("Erro ao salvar: " + err.message);
    label.textContent = originalText;
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function toggleGalleryView() {
  galleryOpen = !galleryOpen;
  galleryEl.mainView.style.display = galleryOpen ? "none" : "block";
  galleryEl.galleryView.style.display = galleryOpen ? "block" : "none";
  galleryEl.toggleBtn.classList.toggle("active", galleryOpen);
  galleryEl.toggleBtn.title = galleryOpen ? "Voltar pras builds" : "Ver/completar os ícones";
  if (galleryOpen) renderGallery();
}

galleryEl.toggleBtn.addEventListener("click", toggleGalleryView);
galleryEl.filterBtns.forEach(btn => btn.addEventListener("click", () => {
  galleryFilter = btn.dataset.filter;
  galleryEl.filterBtns.forEach(b => b.classList.toggle("active", b === btn));
  renderGallery();
}));

// ---------- Fixar por cima do jogo (Picture-in-Picture do navegador) ----------
// Usa a Document Picture-in-Picture API (Chrome/Edge) pra abrir uma janelinha
// separada que o próprio navegador mantém sempre visível, por cima de
// qualquer coisa na tela — inclusive o jogo em tela cheia.

const btnPip = document.getElementById("btnPip");
let pipWindow = null;

async function togglePip() {
  if (!("documentPictureInPicture" in window)) {
    alert("Seu navegador não suporta isso — use Chrome ou Edge atualizados (Firefox/Safari ainda não têm essa função).");
    return;
  }
  if (pipWindow) {
    pipWindow.close();
    return;
  }

  pipWindow = await documentPictureInPicture.requestWindow({ width: 380, height: 560 });

  [...document.styleSheets].forEach(sheet => {
    try {
      const css = [...sheet.cssRules].map(r => r.cssText).join("\n");
      const style = document.createElement("style");
      style.textContent = css;
      pipWindow.document.head.appendChild(style);
    } catch {
      if (sheet.href) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        pipWindow.document.head.appendChild(link);
      }
    }
  });

  pipWindow.document.body.className = document.body.className;
  pipWindow.document.body.setAttribute("data-theme", document.body.getAttribute("data-theme") || "roxo");
  pipWindow.document.body.style.margin = "0";
  pipWindow.document.body.style.background = "rgb(var(--bg-rgb))";
  // Move o elemento de verdade (não uma cópia) pra dentro da janelinha —
  // assim editar/marcar continua funcionando normalmente lá dentro.
  pipWindow.document.body.appendChild(el.buildDetails);
  btnPip.classList.add("active");

  pipWindow.addEventListener("pagehide", () => {
    const savesSection = el.gameView.querySelector(".saves");
    el.gameView.insertBefore(el.buildDetails, savesSection);
    pipWindow = null;
    btnPip.classList.remove("active");
  });
}

btnPip.addEventListener("click", togglePip);

// ---------- Modo Jogo (só o essencial durante a partida) ----------

const GAME_MODE_KEY = "dream-build-helper:game-mode";
const btnGameMode = document.getElementById("btnToggleGameMode");
const gameModeSections = document.querySelectorAll(".selectors, .traveler-row, .build-browser, .saves");

function applyGameMode(on) {
  document.body.classList.toggle("game-mode", on);
  if (pipWindow) pipWindow.document.body.classList.toggle("game-mode", on);
  btnGameMode.classList.toggle("active", on);
  btnGameMode.title = on ? "Sair do Modo Jogo" : "Modo Jogo — só Memories e Essências";
}

btnGameMode.addEventListener("click", () => {
  const on = !document.body.classList.contains("game-mode");
  localStorage.setItem(GAME_MODE_KEY, on ? "1" : "0");
  applyGameMode(on);
});
applyGameMode(localStorage.getItem(GAME_MODE_KEY) === "1");

// ---------- Aparência (transparência do fundo + skin de cor) ----------

const APPEARANCE_KEY = "dream-build-helper:appearance";
const btnSettings = document.getElementById("btnToggleSettings");
const settingsPanel = document.getElementById("settingsPanel");
const bgAlphaSlider = document.getElementById("bgAlphaSlider");
const themeSelect = document.getElementById("themeSelect");

function loadAppearance() {
  try { return JSON.parse(localStorage.getItem(APPEARANCE_KEY)) || {}; }
  catch { return {}; }
}
function saveAppearance(a) {
  localStorage.setItem(APPEARANCE_KEY, JSON.stringify(a));
}

const appearance = { bgAlpha: 100, theme: "roxo", ...loadAppearance() };
document.documentElement.style.setProperty("--bg-alpha", appearance.bgAlpha / 100);
document.body.setAttribute("data-theme", appearance.theme);
bgAlphaSlider.value = appearance.bgAlpha;
themeSelect.value = appearance.theme;

btnSettings.addEventListener("click", () => {
  const open = settingsPanel.style.display === "none";
  settingsPanel.style.display = open ? "flex" : "none";
  btnSettings.classList.toggle("active", open);
});
bgAlphaSlider.addEventListener("input", () => {
  appearance.bgAlpha = Number(bgAlphaSlider.value);
  document.documentElement.style.setProperty("--bg-alpha", appearance.bgAlpha / 100);
  saveAppearance(appearance);
});
themeSelect.addEventListener("change", () => {
  appearance.theme = themeSelect.value;
  document.body.setAttribute("data-theme", appearance.theme);
  if (pipWindow) pipWindow.document.body.setAttribute("data-theme", appearance.theme);
  saveAppearance(appearance);
});

init();

async function init() {
  await fetchOverrides();
  gamesIndex = await fetchJson("data/games/index.json");
  renderGameHome();

  el.btnChangeGame.addEventListener("click", goToGameHome);
  el.btnBack.addEventListener("click", goBack);
  el.btnSaveState.addEventListener("click", saveCurrentAsSlot);
  el.sortBtns.forEach(btn => btn.addEventListener("click", () => {
    currentSort = btn.dataset.sort;
    el.sortBtns.forEach(b => b.classList.toggle("active", b === btn));
    renderBuildCards({ keepSelection: true });
  }));

  renderSaves();
  updateBackButton();

  if (state.current) {
    // Importante: selectGame já escolhe um personagem/build padrão sozinho (e
    // sobrescreve state.current ao fazer isso) — por isso guardamos a seleção
    // salva ANTES de chamar selectGame, senão ela se perde.
    const savedCurrent = { ...state.current };
    await selectGame(savedCurrent.gameId, { silent: true });
    if (savedCurrent.travelerId) {
      selectTraveler(savedCurrent.travelerId, { record: false, autoPick: false });
    }
    if (savedCurrent.buildId) {
      selectBuild(savedCurrent.buildId, { record: false });
    }
  }
  // Sem seleção salva: fica na tela inicial de escolha de jogo (gameHome).
}

function gameCoverHtml(game) {
  const override = getOverride("game", game.id);
  const cover = override.cover || override.icon || game.cover;
  if (cover) {
    return `<img src="${resolveIconSrc(cover)}" alt="" class="game-cover-img" data-kind="game-cover">`;
  }
  return `<div class="game-cover-fallback" style="background:${colorFor(game.id)}">${escapeHtml(game.name.charAt(0).toUpperCase())}</div>`;
}

function renderGameHome() {
  el.gameGrid.innerHTML = gamesIndex.map(g => `
    <div class="game-card">
      <button class="game-card-enter" data-game="${escapeHtml(g.id)}">
        ${gameCoverHtml(g)}
        <span class="game-card-name">${escapeHtml(g.name)}</span>
      </button>
      <label class="gallery-upload-btn game-cover-upload" for="gamecover-${escapeHtml(g.id)}">🖼️ Capa</label>
      <input type="file" id="gamecover-${escapeHtml(g.id)}" accept="image/*" class="gallery-file-input"
        data-kind="game" data-key="${escapeHtml(g.id)}" data-value="">
    </div>
  `).join("");

  el.gameGrid.querySelectorAll(".game-card-enter").forEach(btn => {
    btn.addEventListener("click", () => enterGame(btn.dataset.game));
  });
  el.gameGrid.querySelectorAll(".gallery-file-input").forEach(input => {
    input.addEventListener("change", onGalleryFileChosen);
  });
  el.gameGrid.querySelectorAll(".game-cover-img").forEach(img => {
    img.addEventListener("error", () => {
      const game = gamesIndex.find(g => g.id === img.closest(".game-card").querySelector(".game-card-enter").dataset.game);
      img.outerHTML = `<div class="game-cover-fallback" style="background:${colorFor(game.id)}">${escapeHtml(game.name.charAt(0).toUpperCase())}</div>`;
    }, { once: true });
  });
}

async function enterGame(gameId) {
  await selectGame(gameId, { silent: false });
}

function goToGameHome() {
  el.gameHome.style.display = "block";
  el.gameView.style.display = "none";
  renderGameHome();
}

async function selectGame(gameId, { silent }) {
  const entry = gamesIndex.find(g => g.id === gameId);
  if (!entry) return;
  currentGameData = await fetchJson(`data/games/${entry.file}`);
  el.currentGameName.textContent = entry.name;
  el.gameHome.style.display = "none";
  el.gameView.style.display = "block";
  renderTravelerList();
  if (currentGameData.travelers.length) {
    selectTraveler(currentGameData.travelers[0].id, { record: false, autoPick: true });
  }
  if (!silent) persistCurrentSelectionOnly();
}

function renderTravelerList() {
  el.travelerList.innerHTML = currentGameData.travelers.map(t => `
    <button class="traveler-chip ${t.id === currentTravelerId ? "active" : ""}" data-traveler="${t.id}" title="${escapeHtml(t.name)}">
      ${travelerAvatar(t)}
      <span>${escapeHtml(t.name)}</span>
    </button>
  `).join("");
  el.travelerList.querySelectorAll(".traveler-chip").forEach(btn => {
    btn.addEventListener("click", () => selectTraveler(btn.dataset.traveler, { record: true, autoPick: true }));
  });
  wireIconFallbacks(el.travelerList);
}

function selectTraveler(travelerId, { record, autoPick }) {
  currentTravelerId = travelerId;
  el.travelerList.querySelectorAll(".traveler-chip").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.traveler === travelerId);
  });
  const traveler = currentGameData.travelers.find(t => t.id === travelerId);
  el.buildListTitle.textContent = `Builds de ${traveler ? traveler.name : ""}`;
  renderBuildCards({ keepSelection: false });
  if (autoPick) {
    const builds = [...(traveler?.builds || [])].sort(sorter(currentSort));
    if (builds.length) selectBuild(builds[0].id, { record });
    else selectBuild(null, { record });
  }
}

function currentTraveler() {
  return currentGameData?.travelers.find(t => t.id === currentTravelerId) || null;
}

function currentBuild() {
  const traveler = currentTraveler();
  return traveler?.builds.find(b => b.id === currentBuildId) || null;
}

function sorter(mode) {
  return (a, b) => {
    if (mode === "likes") return (b.likes || 0) - (a.likes || 0);
    if (mode === "views") return (b.views || 0) - (a.views || 0);
    if (mode === "date") return new Date(b.date || 0) - new Date(a.date || 0);
    return 0;
  };
}

function renderBuildCards({ keepSelection }) {
  const traveler = currentTraveler();
  const builds = [...(traveler?.builds || [])].sort(sorter(currentSort));
  const keepId = keepSelection ? currentBuildId : null;

  if (!builds.length) {
    el.buildList.innerHTML = `<p class="empty-hint">Nenhuma build cadastrada ainda pra ${escapeHtml(traveler?.name || "esse personagem")}.</p>`;
    return;
  }

  el.buildList.innerHTML = builds.map(b => `
    <button class="build-card ${b.id === (keepId ?? currentBuildId) ? "active" : ""}" data-build="${b.id}">
      <div class="build-card-top">
        <span class="build-card-name">${escapeHtml(b.name)}</span>
        ${b.tag ? `<span class="tag-pill">${escapeHtml(b.tag)}</span>` : ""}
      </div>
      <div class="build-card-stats">
        <span>👍 ${b.likes || 0}</span>
        <span>👁 ${b.views || 0}</span>
        ${b.date ? `<span>${escapeHtml(b.date)}</span>` : ""}
      </div>
    </button>
  `).join("");

  el.buildList.querySelectorAll(".build-card").forEach(btn => {
    btn.addEventListener("click", () => selectBuild(btn.dataset.build, { record: true }));
  });
}

function selectBuild(buildId, { record }) {
  if (record) recordHistory();
  currentBuildId = buildId;
  el.buildList.querySelectorAll(".build-card").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.build === buildId);
  });
  renderBuildDetails();
  state.current = {
    gameId: currentGameData?.id,
    travelerId: currentTravelerId,
    buildId: buildId || null,
  };
  saveState();
  updateBackButton();
}

let editMode = false;

function renderBuildDetails() {
  const traveler = currentTraveler();
  const build = currentBuild();

  if (!build || !traveler) {
    el.buildDetails.innerHTML = `<p class="empty-hint">Escolha um personagem e uma build acima.</p>`;
    return;
  }

  const rarityFieldHtml = (kind, key, current) => {
    if (kind !== "item") return "";
    return `<select class="gallery-edit-select" data-field="rarity" data-kind="item" data-key="${escapeHtml(key)}">
      ${RARITY_OPTIONS.map(r => `<option value="${r}" ${current === r ? "selected" : ""}>${RARITY_LABEL[r]}</option>`).join("")}
    </select>`;
  };

  const memoriesHtml = (build.memories || []).map((rawM, i) => {
    const m = withOverride("skill", rawM);
    const mKey = overrideKeyFor(m);
    const essencesHtml = (rawM.essences || []).map((rawE, ei) => {
      const e = withOverride("item", rawE);
      const eKey = e.key || `${mKey}__${e.name}`; // usado só pra marcar "já consegui" (pode repetir entre memórias)
      const eOverrideKey = overrideKeyFor(e); // identidade real da essência, usada pra editar nome/raridade/efeito
      if (editMode) {
        return `<li class="${e.note === "core" ? "core" : ""}">
          <div class="essence-row">
            ${iconOrBadge(e.key, "item", e.type, e.icon, e.rarity)}
            <input type="text" class="gallery-edit-input inline-edit-name" data-field="name" data-kind="item" data-key="${escapeHtml(eOverrideKey)}" value="${escapeHtml(e.name)}">
            ${rarityFieldHtml("item", eOverrideKey, e.rarity)}
          </div>
          <textarea class="gallery-edit-textarea" data-field="effect" data-kind="item" data-key="${escapeHtml(eOverrideKey)}" placeholder="Descrição / efeito...">${escapeHtml(e.effect || "")}</textarea>
        </li>`;
      }
      return `<li class="${e.note === "core" ? "core" : ""} ${isObtained(build.id, eKey) ? "obtained" : ""}">
        <div class="essence-row">
          <input type="checkbox" class="obtain-check" data-build="${escapeHtml(build.id)}" data-key="${escapeHtml(eKey)}" ${isObtained(build.id, eKey) ? "checked" : ""} title="Já consegui essa essência nessa run">
          ${iconOrBadge(e.key, "item", e.type, e.icon, e.rarity)}
          <span class="ess-name">${escapeHtml(abbrevEssence(e.name))}</span>
          ${e.note ? `<span class="prio">${escapeHtml(e.note)}</span>` : ""}
          ${e.effect ? `<button class="info-btn small" data-toggle-effect title="Ver descrição">ⓘ</button>` : ""}
        </div>
        ${e.effect ? `<p class="effect-text collapsed">${escapeHtml(e.effect)}</p>` : ""}
      </li>`;
    }).join("");

    if (editMode) {
      return `
        <div class="memory-card">
          <div class="memory-header-row">
            ${iconOrBadge(m.key, "skill", m.type, m.icon)}
            <input type="text" class="gallery-edit-input inline-edit-name" data-field="name" data-kind="skill" data-key="${escapeHtml(mKey)}" value="${escapeHtml(m.name)}">
          </div>
          <textarea class="gallery-edit-textarea" data-field="effect" data-kind="skill" data-key="${escapeHtml(mKey)}" placeholder="Descrição / efeito...">${escapeHtml(m.effect || "")}</textarea>
          <ul class="essence-list">${essencesHtml}</ul>
        </div>`;
    }
    return `
      <div class="memory-card">
        <div class="memory-header-row">
          <input type="checkbox" class="obtain-check" data-build="${escapeHtml(build.id)}" data-key="${escapeHtml(mKey)}" ${isObtained(build.id, mKey) ? "checked" : ""} title="Já consegui essa Memory nessa run">
          <button class="memory-toggle" data-mem="${i}">
            <span class="order">${i + 1}</span>
            ${iconOrBadge(m.key, "skill", m.type, m.icon)}
            <span class="memory-name ${isObtained(build.id, mKey) ? "obtained" : ""}">${escapeHtml(m.name)}</span>
            <span class="chevron">▾</span>
          </button>
          ${m.effect ? `<button class="info-btn" data-mem-info="${i}" title="Ver descrição">ⓘ</button>` : ""}
        </div>
        ${m.effect ? `<p class="effect-text collapsed" data-mem-effect="${i}">${escapeHtml(m.effect)}</p>` : ""}
        <ul class="essence-list">${essencesHtml}</ul>
      </div>`;
  }).join("");

  const constellationHtml = (traveler.constellation || []).map(rawS => {
    const s = withOverride("star", rawS);
    const sKey = overrideKeyFor(s);
    if (editMode) {
      return `<li>
        ${iconOrBadge(s.key, "star", s.category, s.icon)}
        <div class="gallery-row-fields">
          <input type="text" class="gallery-edit-input inline-edit-name" data-field="name" data-kind="star" data-key="${escapeHtml(sKey)}" value="${escapeHtml(s.name)}">
          <select class="gallery-edit-select" data-field="category" data-kind="star" data-key="${escapeHtml(sKey)}">
            ${CATEGORY_OPTIONS.map(c => `<option value="${c}" ${s.category === c ? "selected" : ""}>${CATEGORY_LABEL[c]}</option>`).join("")}
          </select>
          <textarea class="gallery-edit-textarea" data-field="effect" data-kind="star" data-key="${escapeHtml(sKey)}" placeholder="Descrição / efeito...">${escapeHtml(s.effect || "")}</textarea>
        </div>
      </li>`;
    }
    return `<li>${iconOrBadge(s.key, "star", s.category, s.icon)}<div><span class="star-name">${escapeHtml(s.name)}</span><span class="star-effect">${escapeHtml(s.effect)}</span></div></li>`;
  }).join("");

  el.buildDetails.innerHTML = `
    <h3>${escapeHtml(traveler.name)} — ${escapeHtml(build.name)}</h3>
    <div class="meta-row">
      ${build.tag ? `<span class="tag-pill">${escapeHtml(build.tag)}</span>` : ""}
      ${build.season ? `<span>${escapeHtml(build.season)}</span>` : ""}
      ${build.date ? `<span>${escapeHtml(build.date)}</span>` : ""}
      <span title="Número ilustrativo — ainda não puxa dados reais do site da comunidade">👍 ${build.likes || 0}</span>
      <span title="Número ilustrativo — ainda não puxa dados reais do site da comunidade">👁 ${build.views || 0}</span>
    </div>
    ${build.memories?.length ? `<div class="section-label memories-label"><span>Memories e Essências</span><span class="memories-label-actions"><button class="ghost edit-mode-btn ${editMode ? "active" : ""}" id="btnToggleEditMode">✏️ ${editMode ? "Concluir edição" : "Editar"}</button><button class="ghost reset-obtained-btn" id="btnResetObtained">↺ Resetar marcados</button></span></div><div class="memories-wrap">${memoriesHtml}</div>` : ""}
    ${traveler.constellation?.length ? `<div class="section-label">Constelação de ${escapeHtml(traveler.name)} — referência geral (${traveler.constellation.length} estrelas)</div><ul class="constellation-list ${editMode ? "" : "collapsed"}" id="constellationList">${constellationHtml}</ul>${editMode ? "" : `<button class="ghost constellation-toggle" id="btnToggleConstellation">Ver todas as estrelas ▾</button>`}${traveler._constellation_note ? `<p class="constellation-note">${escapeHtml(traveler._constellation_note)}</p>` : ""}` : ""}
    ${build.notes ? `<p class="notes">${escapeHtml(build.notes)}</p>` : ""}
  `;

  const btnEditMode = document.getElementById("btnToggleEditMode");
  if (btnEditMode) {
    btnEditMode.addEventListener("click", () => {
      editMode = !editMode;
      renderBuildDetails();
    });
  }
  if (editMode) {
    el.buildDetails.querySelectorAll(".gallery-edit-input, .gallery-edit-select, .gallery-edit-textarea").forEach(elm => {
      elm.addEventListener("change", onGalleryFieldEdited);
    });
  }
  el.buildDetails.querySelectorAll(".memory-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".memory-card");
      card.classList.toggle("collapsed");
    });
  });
  el.buildDetails.querySelectorAll(".info-btn[data-mem-info]").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = btn.closest(".memory-header-row").nextElementSibling;
      if (p && p.classList.contains("effect-text")) p.classList.toggle("collapsed");
    });
  });
  el.buildDetails.querySelectorAll("[data-toggle-effect]").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = btn.closest(".essence-row").nextElementSibling;
      if (p && p.classList.contains("effect-text")) p.classList.toggle("collapsed");
    });
  });
  el.buildDetails.querySelectorAll(".obtain-check").forEach(chk => {
    chk.addEventListener("change", () => {
      toggleObtained(chk.dataset.build, chk.dataset.key, chk.checked);
      const li = chk.closest("li");
      if (li) li.classList.toggle("obtained", chk.checked);
      const nameSpan = chk.parentElement.querySelector(".memory-name");
      if (nameSpan) nameSpan.classList.toggle("obtained", chk.checked);
    });
  });
  const btnReset = document.getElementById("btnResetObtained");
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      resetObtained(build.id);
      renderBuildDetails();
    });
  }

  const btnToggle = document.getElementById("btnToggleConstellation");
  if (btnToggle) {
    btnToggle.addEventListener("click", () => {
      const list = document.getElementById("constellationList");
      const collapsed = list.classList.toggle("collapsed");
      btnToggle.textContent = collapsed ? "Ver todas as estrelas ▾" : "Mostrar menos ▴";
    });
  }
  wireIconFallbacks(el.buildDetails);
}

// ---------- Histórico (voltar pra seleção anterior) ----------

function recordHistory() {
  if (!state.current) return;
  const last = state.history[state.history.length - 1];
  const same = last && last.gameId === state.current.gameId
    && last.travelerId === state.current.travelerId
    && last.buildId === state.current.buildId;
  if (same) return;
  state.history.push({ ...state.current, ts: Date.now() });
  if (state.history.length > MAX_HISTORY) state.history.shift();
}

async function goBack() {
  if (!state.history.length) return;
  const prev = state.history.pop();
  await selectGame(prev.gameId, { silent: true });
  if (prev.travelerId) selectTraveler(prev.travelerId, { record: false, autoPick: false });
  if (prev.buildId) selectBuild(prev.buildId, { record: false });
  state.current = prev;
  saveState();
  updateBackButton();
}

function updateBackButton() {
  el.btnBack.disabled = state.history.length === 0;
  el.btnBack.style.opacity = state.history.length ? "1" : ".4";
}

// ---------- Estados salvos (nomeados, você que apaga quando quiser) ----------

function saveCurrentAsSlot() {
  if (!state.current || !state.current.buildId) return;
  const label = prompt("Nome pra esse estado salvo:", "");
  if (!label) return;
  state.saves.push({ id: `save-${Date.now()}`, label, ...state.current, ts: Date.now() });
  saveState();
  renderSaves();
}

function renderSaves() {
  el.savesList.innerHTML = "";
  if (!state.saves.length) {
    el.savesList.innerHTML = `<li style="opacity:.5">Nenhum estado salvo ainda.</li>`;
    return;
  }
  state.saves.forEach(save => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="label">${escapeHtml(save.label)}</span>`;
    const btnLoad = document.createElement("button");
    btnLoad.textContent = "Carregar";
    btnLoad.addEventListener("click", () => loadSlot(save));
    const btnDel = document.createElement("button");
    btnDel.textContent = "✕";
    btnDel.className = "del";
    btnDel.addEventListener("click", () => deleteSlot(save.id));
    li.appendChild(btnLoad);
    li.appendChild(btnDel);
    el.savesList.appendChild(li);
  });
}

async function loadSlot(save) {
  recordHistory();
  await selectGame(save.gameId, { silent: true });
  selectTraveler(save.travelerId, { record: false, autoPick: false });
  selectBuild(save.buildId, { record: false });
  state.current = { gameId: save.gameId, travelerId: save.travelerId, buildId: save.buildId };
  saveState();
  updateBackButton();
}

function deleteSlot(id) {
  state.saves = state.saves.filter(s => s.id !== id);
  saveState();
  renderSaves();
}

// ---------- Persistência ----------

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw);
    return {
      current: parsed.current || null,
      history: parsed.history || [],
      saves: parsed.saves || [],
    };
  } catch {
    return { current: null, history: [], saves: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function persistCurrentSelectionOnly() {
  state.current = {
    gameId: currentGameData?.id,
    travelerId: currentTravelerId,
    buildId: currentBuildId,
  };
  saveState();
}

// ---------- Utilidades ----------

async function fetchJson(path) {
  const res = await fetch(path);
  return res.json();
}

function fillSelect(selectEl, options) {
  selectEl.innerHTML = "";
  options.forEach(opt => {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    selectEl.appendChild(o);
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
