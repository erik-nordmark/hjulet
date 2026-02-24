import type { ReactNode } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { GameProvider } from "./context/GameContext"
import AdminPage from "./pages/AdminPage"
import PlayerPage from "./pages/PlayerPage"
import ResetPage from "./pages/ResetPage"
import "./App.css"

const Shell = ({ children }: { children: ReactNode }) => (
  <div className="app-shell">
    <div className="page-container">{children}</div>
  </div>
)

const App = () => (
  <BrowserRouter>
    <GameProvider>
      <Routes>
        <Route index element={<Navigate to="/admin" replace />} />
        <Route
          path="/admin"
          element={
            <Shell>
              <AdminPage />
            </Shell>
          }
        />
        <Route
          path="/join"
          element={
            <Shell>
              <PlayerPage />
            </Shell>
          }
        />
        <Route
          path="/reset"
          element={
            <Shell>
              <ResetPage />
            </Shell>
          }
        />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </GameProvider>
  </BrowserRouter>
)

export default App
