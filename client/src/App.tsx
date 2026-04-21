import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Drivers from "./pages/Drivers";
import Login from "./pages/Login";
import Maintenance from "./pages/Maintenance";
import AddMaintenance from "./pages/AddMaintenance";
import MaintenanceDetail from "./pages/MaintenanceDetail";
import Parts from "./pages/Parts";
import PartDetail from "./pages/PartDetail";
import Reports from "./pages/Reports";
import Schedules from "./pages/Schedules";
import Settings from "./pages/Settings";
import Suppliers from "./pages/Suppliers";
import TruckDetail from "./pages/TruckDetail";
import Trucks from "./pages/Trucks";
import Users from "./pages/Users";
import Inventory from "./pages/Inventory";
import StockRemoval from "./pages/StockRemoval";
import AuditTrail from "./pages/AuditTrail";
import PartsReorder from "./pages/PartsReorder";
import Trips from "./pages/Trips";

function Router() {
  return (
    <Switch>
      {/* Public route — no layout wrapper */}
      <Route path="/login" component={Login} />
      {/* All other routes are wrapped in the authenticated dashboard layout */}
      <Route>
        <DashboardLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/trucks" component={Trucks} />
            <Route path="/trucks/:id" component={TruckDetail} />
            <Route path="/drivers" component={Drivers} />
            <Route path="/suppliers" component={Suppliers} />
            <Route path="/parts" component={Parts} />
            <Route path="/parts/:id" component={PartDetail} />
            <Route path="/inventory" component={Inventory} />
            <Route path="/stock-removal" component={StockRemoval} />
            <Route path="/maintenance" component={Maintenance} />
            <Route path="/maintenance/add" component={AddMaintenance} />
            <Route path="/maintenance/:id" component={MaintenanceDetail} />
            <Route path="/schedules" component={Schedules} />
            <Route path="/reports" component={Reports} />
            <Route path="/audit-trail" component={AuditTrail} />
            <Route path="/reorder" component={PartsReorder} />
            <Route path="/parts-reorder" component={PartsReorder} />
            <Route path="/trips" component={Trips} />
            <Route path="/users" component={Users} />
            <Route path="/settings" component={Settings} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
