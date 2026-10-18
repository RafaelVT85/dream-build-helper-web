import { useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import GamesList from "./routes/GamesList";
import GameDetail from "./routes/GameDetail";
import BuildDetail from "./routes/BuildDetail";
import AdminPage from "./admin/AdminPage";
import AppearancePanel from "./components/AppearancePanel";
import { useApplyStoredAppearance } from "./lib/shapeUiPrefs";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  useApplyStoredAppearance();

  return (
    <div className="app-shell">
      <header className="app-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Link to="/" className="app-title">
          Ajuda Jogos
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AppearancePanel />
          <Link to="/admin" className="pill" style={{ textDecoration: "none" }}>
            Admin
          </Link>
        </div>
      </header>
      <ScrollToTop />
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
