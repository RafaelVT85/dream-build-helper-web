import { Routes, Route, Link } from "react-router-dom";
import GamesList from "./routes/GamesList";
import GameDetail from "./routes/GameDetail";
import BuildDetail from "./routes/BuildDetail";
import AdminPage from "./admin/AdminPage";

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-title">
          Ajuda Jogos
        </Link>
        <Link to="/admin" className="pill" style={{ textDecoration: "none" }}>
          Admin
        </Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<GamesList />} />
          <Route path="/jogos/:gameId" element={<GameDetail />} />
          <Route path="/jogos/:gameId/builds/:buildId" element={<BuildDetail />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  );
}
