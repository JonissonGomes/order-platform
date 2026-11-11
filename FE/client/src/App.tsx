import { Toaster } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch, useLocation } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import PortalPage from "./pages/PortalPage";
import { ROUTES } from "./routes";

// Páginas do dashboard carregadas sob demanda (recharts/zxing ficam fora do bundle inicial)
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const OrdersList = lazy(() => import("./pages/dashboard/OrdersList"));
const OrderNew = lazy(() => import("./pages/dashboard/OrderNew"));
const CustomersList = lazy(() => import("./pages/dashboard/CustomersList"));
const AgendaPage = lazy(() => import("./pages/dashboard/AgendaPage"));
const ProductsPage = lazy(() => import("./pages/dashboard/ProductsPage"));
const CashPage = lazy(() => import("./pages/dashboard/CashPage"));
const BillingPage = lazy(() => import("./pages/dashboard/BillingPage"));
const WarrantiesPage = lazy(() => import("./pages/dashboard/WarrantiesPage"));
const PerformancePage = lazy(() => import("./pages/dashboard/PerformancePage"));
const EmployeesPage = lazy(() => import("./pages/dashboard/EmployeesPage"));
const DepartmentsPage = lazy(() => import("./pages/dashboard/DepartmentsPage"));
const ProfilesPage = lazy(() => import("./pages/dashboard/ProfilesPage"));

function PageFallback() {
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

/** Rotas internas: o layout (sidebar) é montado uma única vez para todo /dashboard/*. */
function DashboardRoutes() {
  return (
    <DashboardLayout>
      <Suspense fallback={<PageFallback />}>
        <Switch>
          <Route path={ROUTES.DASHBOARD} component={DashboardHome} />
          <Route path={ROUTES.ORDER_NEW} component={OrderNew} />
          <Route path={ROUTES.ORDERS} component={OrdersList} />
          <Route path={ROUTES.CUSTOMERS} component={CustomersList} />
          <Route path={ROUTES.AGENDA} component={AgendaPage} />
          <Route path={ROUTES.PRODUCTS} component={ProductsPage} />
          <Route path={ROUTES.CASH} component={CashPage} />
          <Route path={ROUTES.BILLING} component={BillingPage} />
          <Route path={ROUTES.WARRANTIES} component={WarrantiesPage} />
          <Route path={ROUTES.PERFORMANCE} component={PerformancePage} />
          <Route path={ROUTES.EMPLOYEES} component={EmployeesPage} />
          <Route path={ROUTES.DEPARTMENTS} component={DepartmentsPage} />
          <Route path={ROUTES.PROFILES} component={ProfilesPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </DashboardLayout>
  );
}

/**
 * Router da aplicação (veja src/routes.ts para a lista documentada).
 * Públicas: /, /login, /portal. Privadas: /dashboard/*
 */
function Router() {
  const [location] = useLocation();
  if (location === ROUTES.DASHBOARD || location.startsWith(`${ROUTES.DASHBOARD}/`)) {
    return <DashboardRoutes />;
  }

  return (
    <Switch>
      <Route path={ROUTES.HOME} component={Home} />
      <Route path={ROUTES.LOGIN} component={Login} />
      <Route path={ROUTES.PORTAL} component={PortalPage} />
      <Route path={ROUTES.NOT_FOUND} component={NotFound} />
      <Route component={NotFound} />
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
