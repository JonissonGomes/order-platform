import { Toaster } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Suspense } from "react";
import { Route, Switch, useLocation } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { lazyWithRetry } from "./lib/lazyWithRetry";
import Home from "./pages/Home";
import Login from "./pages/Login";
import PortalPage from "./pages/PortalPage";
import { ROUTES } from "./routes";

// Páginas do dashboard carregadas sob demanda (recharts/zxing ficam fora do bundle inicial)
const DashboardHome = lazyWithRetry(() => import("./pages/dashboard/DashboardHome"));
const OrdersList = lazyWithRetry(() => import("./pages/dashboard/OrdersList"));
const OrderNew = lazyWithRetry(() => import("./pages/dashboard/OrderNew"));
const CustomersList = lazyWithRetry(() => import("./pages/dashboard/CustomersList"));
const AgendaPage = lazyWithRetry(() => import("./pages/dashboard/AgendaPage"));
const ProductsPage = lazyWithRetry(() => import("./pages/dashboard/ProductsPage"));
const CashPage = lazyWithRetry(() => import("./pages/dashboard/CashPage"));
const BillingPage = lazyWithRetry(() => import("./pages/dashboard/BillingPage"));
const WarrantiesPage = lazyWithRetry(() => import("./pages/dashboard/WarrantiesPage"));
const PerformancePage = lazyWithRetry(() => import("./pages/dashboard/PerformancePage"));
const EmployeesPage = lazyWithRetry(() => import("./pages/dashboard/EmployeesPage"));
const DepartmentsPage = lazyWithRetry(() => import("./pages/dashboard/DepartmentsPage"));
const ProfilesPage = lazyWithRetry(() => import("./pages/dashboard/ProfilesPage"));

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
 * Públicas: /, /zts/login (só URL), /portal. Privadas: /dashboard/*
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
