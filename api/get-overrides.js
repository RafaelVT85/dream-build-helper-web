// GET /api/get-overrides
// Devolve o "overrides.json" guardado no Vercel Blob — as edições de
// nome/descrição/raridade e os uploads de ícone que qualquer visitante já
// fez, pra aplicar por cima dos dados estáticos do jogo.
import { list } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }
  try {
    const { blobs } = await list({ prefix: "overrides.json", limit: 1 });
    if (!blobs.length) {
      return res.status(200).json({ skill: {}, item: {}, star: {} });
    }
    const response = await fetch(blobs[0].url);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(200).json({ skill: {}, item: {}, star: {} });
  }
}
