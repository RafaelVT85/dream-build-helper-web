// POST /api/upload-icon
// Body: { kind: "skill"|"item"|"star"|"traveler"|"game", key: string, relPath: string, dataBase64: string, contentType: string }
// Sobe a imagem pro Vercel Blob (pasta icons/) e grava a URL num arquivo
// PRÓPRIO desse item (overrides/<kind>/<key>.json) — cada item tem seu
// arquivo, então enviar várias imagens ao mesmo tempo nunca derruba a
// edição de outra (diferente de guardar tudo num overrides.json só).
import { list, put } from "@vercel/blob";

export const config = {
  api: { bodyParser: { sizeLimit: "8mb" } },
};

function safeKey(k) {
  return String(k).replace(/[^a-zA-Z0-9_-]/g, "_");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }
  const { kind, key, relPath, dataBase64, contentType } = req.body || {};
  if (!relPath || !dataBase64) {
    return res.status(400).json({ error: "relPath e dataBase64 são obrigatórios" });
  }

  try {
    const bytes = Buffer.from(dataBase64, "base64");
    const blob = await put(`icons/${relPath}`, bytes, {
      access: "public",
      contentType: contentType || "image/png",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    // Grava a URL no arquivo PRÓPRIO desse item (kind+key), não num arquivo
    // global — assim uploads simultâneos de itens diferentes nunca colidem.
    if (kind && key) {
      const path = `overrides/${kind}/${safeKey(key)}.json`;
      let current = {};
      const { blobs } = await list({ prefix: path, limit: 1 });
      if (blobs.length) {
        const response = await fetch(blobs[0].url);
        current = await response.json();
      }
      current.icon = blob.url;
      current._originalKey = key; // preserva o nome exato (pode ter acento/espaço)
      await put(path, JSON.stringify(current), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    }

    return res.status(200).json({ ok: true, url: blob.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}
