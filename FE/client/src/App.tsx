import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import CustomerLogin from "./pages/CustomerLogin";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Profiles from "./pages/Profiles";
import ServiceOrders from "./pages/ServiceOrders";
import PreOrders from "./pages/PreOrders";
import Customers from "./pages/Customers";
import Departments from "./pages/Departments";
import Employees from "./pages/Employees";
import PublicOrderTracking from "./pages/PublicOrderTracking";
import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerProfile from "./pages/CustomerProfile";
import CustomerOrdersHistory from "./pages/CustomerOrdersHistory";
import PrintServiceOrder from "./pages/PrintServiceOrder";
import Stock from "./pages/Stock";
import Financial from "./pages/Financial";
import SettingsPage from "./pages/Settings";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import NoAccess from "./pages/NoAccess";

/**
 * Router da Aplicação
 * 
 * ROTAS IMPLEMENTADAS:
 * - / (Home) - Landing page da aplicação
 * - /login - Página de login
 * - /dashboard - Dashboard principal (requer autenticação)
 * - /404 (NotFound) - Página de erro 404
 * 
 * Para ver todas as rotas documentadas, consulte: src/routes.ts
 */
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/cliente/login"} component={CustomerLogin} />
      <Route path={"/cliente/dashboard"} component={CustomerDashboard} />
      <Route path={"/cliente/perfil"} component={CustomerProfile} />
      <Route path={"/cliente/ordens"} component={CustomerOrdersHistory} />
      <Route path={"/register"} component={Register} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/profiles"} component={Profiles} />
      <Route path={"/service-orders"} component={ServiceOrders} />
      <Route path={"/pre-orders"} component={PreOrders} />
      <Route path={"/customers"} component={Customers} />
      <Route path={"/departments"} component={Departments} />
      <Route path={"/employees"} component={Employees} />
      <Route path={"/stock"} component={Stock} />
      <Route path={"/financial"} component={Financial} />
      <Route path={"/settings"} component={SettingsPage} />
      <Route path={"/reports"} component={Reports} />
      <Route path={"/notifications"} component={Notifications} />
      <Route path={"/track"} component={PublicOrderTracking} />
      <Route path={"/print/order/:id"} component={PrintServiceOrder} />
      <Route path={"/no-access"} component={NoAccess} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
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
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
