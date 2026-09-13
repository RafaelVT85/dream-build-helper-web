// POST /api/save-override
// Body: { kind: "skill"|"item"|"star", key: string, patch: { name?, effect?, rarity?, category?, icon? } }
// Lê o overrides.json atual do Vercel Blob, aplica o patch por cima da chave
// certa, e salva de volta — assim fica permanente pra qualquer visitante.
import { list, put } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }
  const { kind, key, patch } = req.body || {};
  if (!kind || !key || !patch || !["skill", "item", "star"].includes(kind)) {
    return res.status(400).json({ error: "kind, key e patch são obrigatórios" });
  }

  try {
    const { blobs } = await list({ prefix: "overrides.json", limit: 1 });
    let data = { skill: {}, item: {}, star: {} };
    if (blobs.length) {
      const response = await fetch(blobs[0].url);
      data = await response.json();
    }

    data[kind] = data[kind] || {};
    data[kind][key] = { ...(data[kind][key] || {}) };
    for (const [field, value] of Object.entries(patch)) {
      if (value === undefined || value === "") {
        delete data[kind][key][field];
      } else {
        data[kind][key][field] = value;
      }
    }
    if (Object.keys(data[kind][key]).length === 0) {
      delete data[kind][key];
    }

    await put("overrides.json", JSON.stringify(data), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}
