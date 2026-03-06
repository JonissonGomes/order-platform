/**
 * Rotas da Aplicação Frontend
 * 
 * Este arquivo documenta todas as rotas disponíveis na aplicação.
 * 
 * ROTAS PÚBLICAS (sem autenticação):
 * - / (Home/Landing Page) - Página inicial com apresentação da plataforma
 * - /login - Página de login
 * - /404 (NotFound) - Página de erro 404
 * 
 * ROTAS PRIVADAS (requerem autenticação):
 * - /dashboard - Dashboard principal com estatísticas e informações
 * 
 * ROTAS DO DASHBOARD (definidas no DashboardLayout):
 * - / - Página 1 do dashboard (quando autenticado)
 * - /some-path - Página 2 do dashboard (a ser implementada)
 * 
 * NOTA: As rotas /login e /dashboard estão implementadas e funcionais.
 */

export const ROUTES = {
  // Rotas públicas
  HOME: "/",
  NOT_FOUND: "/404",
  
  // Rotas de autenticação
  LOGIN: "/login",
  
  // Rotas do dashboard
  DASHBOARD: "/dashboard",
  DASHBOARD_PAGE_1: "/",
  DASHBOARD_PAGE_2: "/some-path",
} as const;

export type RoutePath = typeof ROUTES[keyof typeof ROUTES];
