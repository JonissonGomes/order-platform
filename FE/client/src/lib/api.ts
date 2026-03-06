// API client for REST API calls to Go backend

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
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include", // Important for cookies
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
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
