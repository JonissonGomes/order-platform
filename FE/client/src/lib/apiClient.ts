// Cliente HTTP base para a API Go (cookies HTTP-only, credentials: include)
//
// ZTS_API_BASE_URL:
//   - Dev: http://localhost:8080 (ou vazio para usar o proxy /api do Vite)
//   - Prod: https://api.seusite.com (CORS_ORIGINS deve conter a origem do frontend)
import { handleApiError, handleHttpError } from "./errors";

const FALLBACK_API_URL = import.meta.env.DEV ? "" : "http://localhost:8080";

export const API_BASE_URL: string =
  import.meta.env.ZTS_API_BASE_URL ?? FALLBACK_API_URL;

if (!import.meta.env.ZTS_API_BASE_URL) {
  console.warn(
    "⚠️ ZTS_API_BASE_URL não está configurado. " +
      `Usando "${API_BASE_URL || "(proxy /api do Vite)"}". ` +
      "Configure no .env do frontend: ZTS_API_BASE_URL=http://localhost:8080 (dev) ou https://api.seusite.com (prod)."
  );
}

export async function fetchAPI<T>(
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
      credentials: "include", // cookies de sessão
    });
  } catch (error) {
    throw new Error(handleApiError(error).message);
  }

  if (!response.ok) {
    throw new Error((await handleHttpError(response)).message);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function jsonBody(data: unknown): Pick<RequestInit, "body"> {
  return { body: JSON.stringify(data) };
}

/** Monta query string ignorando valores vazios. */
export function qs(params?: object): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const out = search.toString();
  return out ? `?${out}` : "";
}

/**
 * Normaliza respostas de lista: aceita `[...]` ou `{ <key>: [...] }`
 * (padrão atual do backend: `{ employees: [...] }`).
 */
export function listOf<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[];
  const wrapped = (data as Record<string, unknown> | null | undefined)?.[key];
  return Array.isArray(wrapped) ? (wrapped as T[]) : [];
}

/** Normaliza respostas de item: aceita `{...}` ou `{ <key>: {...} }`. */
export function itemOf<T>(data: unknown, key: string): T {
  const wrapped = (data as Record<string, unknown> | null | undefined)?.[key];
  return (wrapped ?? data) as T;
}
