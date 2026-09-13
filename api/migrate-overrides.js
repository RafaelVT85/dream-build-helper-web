// GET /api/migrate-overrides
// Uso único: lê o antigo overrides.json (formato compartilhado) e regrava
// cada item no novo formato (overrides/<kind>/<key>.json). Depois de rodar
// uma vez com sucesso, pode apagar este arquivo — ele não é usado pelo app.
import { list, put } from "@vercel/blob";

function safeKey(k) {
  return String(k).replace(/[^a-zA-Z0-9_-]/g, "_");
}

export default async function handler(req, res) {
  try {
    const { blobs } = await list({ prefix: "overrides.json", limit: 1 });
    if (!blobs.length) {
      return res.status(200).json({ ok: true, migrated: 0, note: "Nenhum overrides.json antigo encontrado." });
    }
    const old = await (await fetch(blobs[0].url)).json();
    let migrated = 0;
    const log = [];

    for (const kind of ["skill", "item", "star", "game"]) {
      for (const [key, patch] of Object.entries(old[kind] || {})) {
        const path = `overrides/${kind}/${safeKey(key)}.json`;
        const data = { ...patch, _originalKey: key };
        await put(path, JSON.stringify(data), {
          access: "public", contentType: "application/json",
          addRandomSuffix: false, allowOverwrite: true,
        });
        migrated++;
        log.push(`${kind}/${key}`);
      }
    }

    return res.status(200).json({ ok: true, migrated, log });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
