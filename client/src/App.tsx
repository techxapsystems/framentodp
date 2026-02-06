import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FilterProvider } from "./contexts/FilterContext";
import DashboardLayout from "./components/DashboardLayout";
import Today from "./pages/Today";
import Week from "./pages/Week";
import Import from "./pages/Import";
import Settings from "./pages/Settings";
import Recidivists from "./pages/Recidivists";
import WarningsManagement from "./pages/WarningsManagement";
import WarningsTracking from "./pages/WarningsTracking";
import Reports from "./pages/Reports";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <DashboardLayout>
      <Switch>
        <Route path={"/"} component={Today} />
        <Route path={"/semana"} component={Week} />
        <Route path={"/reincidentes"} component={Recidivists} />
        <Route path={"/advertencias"} component={WarningsManagement} />
        <Route path={"/acompanhamento"} component={WarningsTracking} />
        <Route path={"/relatorios"} component={Reports} />
        <Route path={"/importacao"} component={Import} />
        <Route path={"/configuracoes"} component={Settings} />
        <Route path={"/404"} component={NotFound} />
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
