// GET /api/get-overrides
// Lista todos os arquivos em overrides/<kind>/<key>.json no Vercel Blob e
// monta um único objeto { skill: {...}, item: {...}, star: {...}, game: {...} }
// pro front-end aplicar por cima dos dados estáticos do jogo.
import { list } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }
  const result = { skill: {}, item: {}, star: {}, game: {} };
  try {
    let cursor;
    const all = [];
    do {
      const page = await list({ prefix: "overrides/", cursor, limit: 1000 });
      all.push(...page.blobs);
      cursor = page.cursor;
    } while (cursor);

    await Promise.all(all.map(async (b) => {
      // pathname esperado: overrides/<kind>/<key>.json
      const m = b.pathname.match(/^overrides\/([^/]+)\/(.+)\.json$/);
      if (!m) return;
      const [, kind] = m;
      if (!result[kind]) return;
      try {
        const resp = await fetch(b.url);
        const data = await resp.json();
        const realKey = data._originalKey;
        delete data._originalKey;
        if (realKey && Object.keys(data).length > 0) {
          result[kind][realKey] = data;
        }
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
