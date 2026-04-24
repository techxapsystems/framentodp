import { useState, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FilterProvider } from "./contexts/FilterContext";
import DashboardLayout from "./components/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Today from "./pages/Today";
import Week from "./pages/Week";
import Import from "./pages/Import";
import Settings from "./pages/Settings";
import Recidivists from "./pages/Recidivists";

import WarningsTracking from "./pages/WarningsTracking";
import WarningSignOff from "./pages/WarningSignOff";
import Reports from "./pages/Reports";
import Audit from "./pages/Audit";
import DataRetention from "./pages/DataRetention";
import TemplateLibrary from "./pages/TemplateLibrary";
import UserManagement from "./pages/UserManagement";
import Login from "./pages/Login";
import AnaliseGifBrf from "./pages/AnaliseGifBrf";
import ComparisonReport from "./pages/ComparisonReport";
import ImportAdministrative from "./pages/ImportAdministrative";


function Router() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Carregar usuário do localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Erro ao carregar usuário:", e);
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={() => (
          <ProtectedRoute requiredModules={["controle_de_advertencias"]}>
            <Recidivists />
          </ProtectedRoute>
        )} />
        <Route path="/cadastro-advertencias" component={() => (
          <ProtectedRoute requiredModules={["controle_de_advertencias"]}>
            <Recidivists />
          </ProtectedRoute>
        )} />
        <Route path="/semana" component={() => (
          <ProtectedRoute requiredModules={["operacional_jornada"]}>
            <Week />
          </ProtectedRoute>
        )} />
        <Route path="/reincidentes" component={() => (
          <ProtectedRoute requiredModules={["controle_de_advertencias"]}>
            <Recidivists />
          </ProtectedRoute>
        )} />

        <Route path="/acompanhamento" component={() => (
          <ProtectedRoute requiredModules={["controle_de_advertencias"]}>
            <WarningsTracking />
          </ProtectedRoute>
        )} />

        <Route path="/relatorios" component={() => (
          <ProtectedRoute requiredModules={["controle_de_advertencias"]}>
            <Reports />
          </ProtectedRoute>
        )} />
        <Route path="/baixa-advertencias" component={() => (
          <ProtectedRoute requiredModules={["controle_de_advertencias"]}>
            <WarningSignOff />
          </ProtectedRoute>
        )} />
        <Route path="/importacao" component={() => (
          <ProtectedRoute requiredModules={["operacional_jornada"]}>
            <Import />
          </ProtectedRoute>
        )} />
        <Route path="/importacao-administrativos" component={() => (
          <ProtectedRoute requiredRole="admin">
            <ImportAdministrative />
          </ProtectedRoute>
        )} />
        <Route path="/configuracoes" component={Settings} />
        <Route path="/auditoria" component={() => (
          <ProtectedRoute requiredRole="admin">
            <Audit />
          </ProtectedRoute>
        )} />
        <Route path="/retenção-dados" component={() => (
          <ProtectedRoute requiredRole="admin">
            <DataRetention />
          </ProtectedRoute>
        )} />
        <Route path="/usuarios" component={() => (
          <ProtectedRoute requiredRole="admin">
            <UserManagement />
          </ProtectedRoute>
        )} />
        <Route path="/biblioteca-modelos" component={() => (
          <ProtectedRoute requiredModules={["controle_de_advertencias"]}>
            <TemplateLibrary />
          </ProtectedRoute>
        )} />
        <Route path="/analise-gif-brf" component={() => (
          <ProtectedRoute requiredModules={["analise_gif_brf"]}>
            <AnaliseGifBrf />
          </ProtectedRoute>
        )} />
        <Route path="/relatorio-comparativo" component={() => (
          <ProtectedRoute requiredModules={["analise_gif_brf"]}>
            <ComparisonReport />
          </ProtectedRoute>
        )} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <FilterProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </FilterProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
