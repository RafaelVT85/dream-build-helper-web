import { Routes, Route, Link } from "react-router-dom";
import GamesList from "./routes/GamesList";
import GameDetail from "./routes/GameDetail";
import BuildDetail from "./routes/BuildDetail";

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-title">
          Ajuda Jogos
        </Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<GamesList />} />
          <Route path="/jogos/:gameId" element={<GameDetail />} />
          <Route path="/jogos/:gameId/builds/:buildId" element={<BuildDetail />} />
        </Routes>
      </main>
    </div>
  );
}
