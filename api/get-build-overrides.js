// GET /api/get-build-overrides
// Mesma ideia do get-overrides.js do Shape of Dreams, mas pra builds de
// qualquer jogo: cada build editada pelo painel de admin vira 1 arquivo em
// overrides/build/<gameId>__<buildId>.json no Vercel Blob. O front-end
// aplica isso por cima dos dados estáticos de public/data/games/*.json.
import { list } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }
  const result = {};
  try {
    let cursor;
    const all = [];
    do {
      const page = await list({ prefix: "overrides/build/", cursor, limit: 1000 });
      all.push(...page.blobs);
      cursor = page.cursor;
    } while (cursor);

    await Promise.all(all.map(async (b) => {
      const m = b.pathname.match(/^overrides\/build\/(.+)\.json$/);
      if (!m) return;
      const key = m[1]; // "<gameId>__<buildId>"
      try {
        const resp = await fetch(b.url);
        const data = await resp.json();
        result[key] = data;
      } catch {
        // arquivo corrompido/ilegível — ignora esse item, não quebra o resto
      }
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(200).json(result);
  }
}
