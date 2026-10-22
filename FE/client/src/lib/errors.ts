/**
 * Error handling utilities for safe and user-friendly error messages
 * 
 * This module provides error handling that:
 * - Shows intuitive messages to users
 * - Hides technical details that could compromise security
 * - Handles different error types (network, auth, validation, server)
 */

export enum ErrorType {
  NETWORK = "NETWORK",
  AUTHENTICATION = "AUTHENTICATION",
  VALIDATION = "VALIDATION",
  NOT_FOUND = "NOT_FOUND",
  FORBIDDEN = "FORBIDDEN",
  SERVER = "SERVER",
  UNKNOWN = "UNKNOWN",
}

export interface ApiError {
  type: ErrorType;
  message: string;
  statusCode?: number;
}

/**
 * Extracts error type from HTTP status code
 */
function getErrorType(statusCode: number): ErrorType {
  if (statusCode >= 500) {
    return ErrorType.SERVER;
  }
  if (statusCode === 401) {
    return ErrorType.AUTHENTICATION;
  }
  if (statusCode === 403) {
    return ErrorType.FORBIDDEN;
  }
  if (statusCode === 404) {
    return ErrorType.NOT_FOUND;
  }
  if (statusCode >= 400 && statusCode < 500) {
    return ErrorType.VALIDATION;
  }
  return ErrorType.UNKNOWN;
}

/**
 * Gets user-friendly error message based on error type
 */
function getUserFriendlyMessage(errorType: ErrorType, customMessage?: string): string {
  // If we have a safe custom message from backend, use it
  if (customMessage && isSafeMessage(customMessage)) {
    return customMessage;
  }

  // Otherwise, use generic messages
  switch (errorType) {
    case ErrorType.NETWORK:
      return "Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.";
    
    case ErrorType.AUTHENTICATION:
      return "Credenciais inválidas. Verifique seu email e senha.";
    
    case ErrorType.FORBIDDEN:
      return "Você não tem permissão para realizar esta ação.";
    
    case ErrorType.NOT_FOUND:
      return ""; // Não mostrar mensagem para 404 - silenciar
    
    case ErrorType.VALIDATION:
      return customMessage || "Os dados fornecidos são inválidos. Verifique e tente novamente.";
    
    case ErrorType.SERVER:
      return "Ocorreu um erro no servidor. Por favor, tente novamente mais tarde.";
    
    case ErrorType.UNKNOWN:
    default:
      return "Ocorreu um erro inesperado. Por favor, tente novamente.";
  }
}

/**
 * Checks if a message is safe to display to users
 * Filters out technical details, stack traces, file paths, etc.
 */
function isSafeMessage(message: string): boolean {
  const unsafePatterns = [
    /stack trace/i,
    /at \w+\.\w+/i, // Stack trace lines
    /file:\/\//i, // File paths
    /\/[a-z0-9\/\-_]+\.(js|ts|go|py)/i, // File paths
    /line \d+/i,
    /column \d+/i,
    /mongodb/i,
    /database/i,
    /connection/i,
    /sql/i,
    /query/i,
    /undefined/i,
    /null pointer/i,
    /panic/i,
    /fatal/i,
  ];

  return !unsafePatterns.some(pattern => pattern.test(message));
}

/**
 * Sanitizes error message to remove technical details
 */
function sanitizeMessage(message: string): string {
  // Remove common technical prefixes
  let sanitized = message
    .replace(/^Error: /i, "")
    .replace(/^Failed to /i, "")
    .trim();

  // If message is too technical, return generic
  if (!isSafeMessage(sanitized)) {
    return "";
  }

  return sanitized;
}

/**
 * Handles fetch errors and converts them to user-friendly messages
 */
export function handleApiError(error: unknown): ApiError {
  // Network errors (no response from server)
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      type: ErrorType.NETWORK,
      message: getUserFriendlyMessage(ErrorType.NETWORK),
    };
  }

  // Check if it's an Error with status code (from our fetchAPI)
  if (error instanceof Error) {
    // Try to extract status code from error message
    const statusMatch = error.message.match(/status: (\d+)/);
    if (statusMatch) {
      const statusCode = parseInt(statusMatch[1], 10);
      const errorType = getErrorType(statusCode);
      const sanitized = sanitizeMessage(error.message);
      
      return {
        type: errorType,
        message: getUserFriendlyMessage(errorType, sanitized),
        statusCode,
      };
    }

    // Generic error with message
    const sanitized = sanitizeMessage(error.message);
    if (sanitized) {
      return {
        type: ErrorType.UNKNOWN,
        message: sanitized,
      };
    }
  }

  // Unknown error
  return {
    type: ErrorType.UNKNOWN,
    message: getUserFriendlyMessage(ErrorType.UNKNOWN),
  };
}

/**
 * Handles HTTP response errors
 */
export async function handleHttpError(response: Response): Promise<ApiError> {
  const errorType = getErrorType(response.status);
  
  // Try to parse error message from response
  let customMessage: string | undefined;
  try {
    const data = await response.json();
    if (data.error && typeof data.error === "string") {
      customMessage = sanitizeMessage(data.error);
    }
  } catch {
    // If response is not JSON, ignore
  }

  return {
    type: errorType,
    message: getUserFriendlyMessage(errorType, customMessage),
    statusCode: response.status,
  };
}
