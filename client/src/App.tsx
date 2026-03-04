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
import WarningsManagement from "./pages/WarningsManagement";
import WarningsTracking from "./pages/WarningsTracking";
import Reports from "./pages/Reports";
import Audit from "./pages/Audit";
import DataRetention from "./pages/DataRetention";
import TemplateLibrary from "./pages/TemplateLibrary";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={() => (
          <ProtectedRoute requiredModules={["operacional_jornada"]}>
            <Today />
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
        <Route path="/advertencias" component={() => (
          <ProtectedRoute requiredModules={["controle_de_advertencias"]}>
            <WarningsManagement />
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
        <Route path="/importacao" component={() => (
          <ProtectedRoute requiredModules={["operacional_jornada"]}>
            <Import />
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
        <Route path="/biblioteca-modelos" component={() => (
          <ProtectedRoute requiredModules={["controle_de_advertencias"]}>
            <TemplateLibrary />
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
