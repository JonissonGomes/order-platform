// API client for REST API calls to Go backend
// 
// IMPORTANTE: VITE_API_URL deve ser configurado sempre (dev e prod)
// 
// Development:
//   - Configure VITE_API_URL=http://localhost:8080 no .env
//   - Configure CORS_ORIGINS no backend com as URLs do frontend
//   - O backend valida a origem via CORS para segurança
//
// Production:
//   - Configure VITE_API_URL=https://api.seusite.com no .env
//   - Configure CORS_ORIGINS no backend com as URLs permitidas
//   - Use HTTPS sempre em produção
//
// Segurança:
//   - CORS está configurado no backend para validar origens
//   - Cookies são HTTP-only e SameSite para proteção CSRF
//   - Credentials são enviados apenas para a origem configurada

import { handleHttpError, handleApiError } from "./errors";

// VITE_API_URL é obrigatório para garantir segurança e consistência
const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  console.error(
    "⚠️ VITE_API_URL não está configurado! " +
    "Configure no arquivo .env do frontend. " +
    "Exemplo: VITE_API_URL=http://localhost:8080 (dev) ou https://api.seusite.com (prod)"
  );
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
}

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  let response: Response;
  
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // Important for cookies
    });
  } catch (error) {
    // Network error (no response from server)
    const apiError = handleApiError(error);
    throw new Error(apiError.message);
  }

  if (!response.ok) {
    // HTTP error (response received but status is not ok)
    const apiError = await handleHttpError(response);
    throw new Error(apiError.message);
  }

  return response.json();
}

export const api = {
  // Auth endpoints
  async login(data: LoginRequest): Promise<AuthResponse> {
    return fetchAPI<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    return fetchAPI<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getMe(): Promise<{ user: User | null }> {
    return fetchAPI<{ user: User | null }>("/api/auth/me");
  },

  async logout(): Promise<{ success: boolean }> {
    return fetchAPI<{ success: boolean }>("/api/auth/logout", {
      method: "POST",
    });
  },
};
