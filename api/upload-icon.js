// POST /api/upload-icon
// Body: { kind: "skill"|"item"|"star"|"traveler", key: string, relPath: string, dataBase64: string, contentType: string }
// Sobe a imagem pro Vercel Blob (pasta icons/) e grava a URL pública no
// overrides.json, na chave certa, pra aparecer pra todo mundo que visitar.
import { list, put } from "@vercel/blob";

export const config = {
  api: { bodyParser: { sizeLimit: "8mb" } },
};

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

    // Além de subir o arquivo, já grava a URL no overrides.json (se o
    // chamador mandou kind+key — a Galeria manda; um upload avulso não).
    if (kind && key) {
      const { blobs } = await list({ prefix: "overrides.json", limit: 1 });
      let data = { skill: {}, item: {}, star: {} };
      if (blobs.length) {
        const response = await fetch(blobs[0].url);
        data = await response.json();
      }
      data[kind] = data[kind] || {};
      data[kind][key] = { ...(data[kind][key] || {}), icon: blob.url };
      await put("overrides.json", JSON.stringify(data), {
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
