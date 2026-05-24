import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/layout/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { DocsPage } from "@/pages/DocsPage";
import { AppDocsPage } from "@/pages/AppDocsPage";
import { IncidentsPage } from "@/pages/IncidentsPage";
import { IntegrationsPage } from "@/pages/IntegrationsPage";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { SettingsPage } from "@/pages/SettingsPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/incidents/:id" element={<IncidentsPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/app/docs" element={<AppDocsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
