import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/RouteGuards";
import { Shell } from "./components/Shell";
import { AskPage } from "./pages/AskPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { UsersPage } from "./pages/UsersPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route path="/app" element={<ProtectedRoute><Shell><DashboardPage /></Shell></ProtectedRoute>} />
      <Route path="/app/documents" element={<ProtectedRoute><Shell><DocumentsPage /></Shell></ProtectedRoute>} />
      <Route path="/app/ask" element={<ProtectedRoute><Shell><AskPage /></Shell></ProtectedRoute>} />
      <Route path="/app/users" element={<ProtectedRoute><Shell><UsersPage /></Shell></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
