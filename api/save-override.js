// POST /api/save-override
// Body: { kind: "skill"|"item"|"star"|"game", key: string, patch: { name?, effect?, rarity?, category?, icon? } }
// Lê o arquivo PRÓPRIO desse item (overrides/<kind>/<key>.json), aplica o
// patch, e salva de volta. Cada item tem seu próprio arquivo no Blob —
// editar dois itens diferentes ao mesmo tempo nunca derruba um ao outro
// (diferente de guardar tudo num overrides.json compartilhado).
import { list, put } from "@vercel/blob";

function safeKey(k) {
  return String(k).replace(/[^a-zA-Z0-9_-]/g, "_");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }
  const { kind, key, patch } = req.body || {};
  if (!kind || !key || !patch || !["skill", "item", "star", "game"].includes(kind)) {
    return res.status(400).json({ error: "kind, key e patch são obrigatórios" });
  }

  try {
    const path = `overrides/${kind}/${safeKey(key)}.json`;
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
    current._originalKey = key; // preserva o nome exato (pode ter acento/espaço)

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
