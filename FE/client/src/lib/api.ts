// API client for REST API calls to Go backend
// 
// Development:
//   - If VITE_API_URL is set: use it directly (bypasses Vite proxy)
//   - If not set: use "/api" which will be proxied by Vite to http://localhost:8080
//
// Production:
//   - VITE_API_URL must be set with the full backend URL (e.g., https://api.example.com)
//   - No proxy is available in production, so direct URL is required

import { handleHttpError, handleApiError } from "./errors";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

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
    return fetchAPI<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    return fetchAPI<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getMe(): Promise<{ user: User | null }> {
    return fetchAPI<{ user: User | null }>("/auth/me");
  },

  async logout(): Promise<{ success: boolean }> {
    return fetchAPI<{ success: boolean }>("/auth/logout", {
      method: "POST",
    });
  },
};
