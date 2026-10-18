import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchGamesIndex } from "../data/games";

export default function GamesList() {
  const [games, setGames] = useState<{ id: string; name: string; file: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Ajuda Jogos";
    fetchGamesIndex()
      .then((data) => setGames(data.games))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="card" style={{ margin: 24 }}>{error} — <button onClick={() => window.location.reload()}>Tentar de novo</button></p>;
  if (!games.length) return <p style={{ margin: 24 }} className="muted">Carregando jogos…</p>;

  return (
    <div className="grid">
      {games.map((g) => (
        <Link key={g.id} to={`/jogos/${g.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <h3 style={{ margin: 0 }}>{g.name}</h3>
        </Link>
      ))}
    </div>
  );
}
