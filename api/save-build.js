// POST /api/save-build
// Body: { password: string, gameId: string, buildId: string, phase: "leveling"|"endgame", patch: object }
// Protegido por senha simples (variável de ambiente ADMIN_PASSWORD na Vercel).
// Salva/atualiza overrides/build/<gameId>__<buildId>.json no Vercel Blob —
// cada build tem seu próprio arquivo, então editar builds diferentes ao
// mesmo tempo nunca derruba uma a outra.
import { list, put } from "@vercel/blob";

function safeKey(k) {
  return String(k).replace(/[^a-zA-Z0-9_-]/g, "_");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { password, gameId, buildId, phase, patch } = req.body || {};

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return res.status(500).json({
      error: "ADMIN_PASSWORD não configurada na Vercel — configure em Settings > Environment Variables antes de usar o painel de admin.",
    });
  }
  if (password !== expected) {
    return res.status(401).json({ error: "Senha incorreta" });
  }

  if (!gameId || !buildId || !phase || !patch) {
    return res.status(400).json({ error: "gameId, buildId, phase e patch são obrigatórios" });
  }

  try {
    const key = `${safeKey(gameId)}__${safeKey(buildId)}`;
    const path = `overrides/build/${key}.json`;
    let current = {};
    const { blobs } = await list({ prefix: path, limit: 1 });
    if (blobs.length) {
      const response = await fetch(blobs[0].url);
      current = await response.json();
    }

    for (const [field, value] of Object.entries(patch)) {
      if (value === undefined || value === "") {
        delete current[field];
      } else {
        current[field] = value;
      }
    }
    current._gameId = gameId;
    current._buildId = buildId;
    current._phase = phase;
    current._updatedAt = new Date().toISOString();

    await put(path, JSON.stringify(current), {
      access: "public", contentType: "application/json",
      addRandomSuffix: false, allowOverwrite: true,
    });

    return res.status(200).json({ ok: true, data: current });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}
