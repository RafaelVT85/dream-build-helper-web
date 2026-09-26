// POST /api/admin-login
// Body: { password: string }
// Só confirma se a senha bate com ADMIN_PASSWORD (variável de ambiente na
// Vercel) — a senha real nunca é exposta pro navegador. O front-end guarda
// a senha em memória (não em localStorage) e a reenvia em cada save.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }
  const { password } = req.body || {};
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return res.status(500).json({
      error: "ADMIN_PASSWORD não configurada na Vercel — configure em Settings > Environment Variables.",
    });
  }
  if (password === expected) {
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: "Senha incorreta" });
}
