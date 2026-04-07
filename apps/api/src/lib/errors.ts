/**
 * Custom error class with user-friendly messages
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(options: {
    code: string;
    message: string;
    userMessage: string;
    statusCode?: number;
    details?: Record<string, unknown>;
  }) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.userMessage = options.userMessage;
    this.statusCode = options.statusCode ?? 500;
    this.details = options.details;
  }
}

/**
 * Pre-defined error factories for common scenarios
 */
export const Errors = {
  // Hackathon errors
  hackathonNotFound: (hackathonId: number) =>
    new AppError({
      code: "HACKATHON_NOT_FOUND",
      message: `Hackathon with id ${hackathonId} not found`,
      userMessage: "El hackathon que buscas no existe o fue eliminado",
      statusCode: 404,
      details: { hackathonId },
    }),

  hackathonNoteLimitReached: (phaseNumber: number, limit: number) =>
    new AppError({
      code: "HACKATHON_NOTE_LIMIT",
      message: `Phase ${phaseNumber} has reached the note limit of ${limit}`,
      userMessage: `Esta fase ya tiene el máximo de ${limit} notas. Elimina algunas para agregar más.`,
      statusCode: 400,
      details: { phaseNumber, limit },
    }),

  invalidPhaseNumber: (phaseNumber: number) =>
    new AppError({
      code: "INVALID_PHASE_NUMBER",
      message: `Invalid phase number: ${phaseNumber}`,
      userMessage: "El número de fase no es válido. Debe ser entre 0 y 8.",
      statusCode: 400,
      details: { phaseNumber, validRange: "0-8" },
    }),

  invalidPhaseStatus: (status: string) =>
    new AppError({
      code: "INVALID_PHASE_STATUS",
      message: `Invalid phase status: ${status}`,
      userMessage: "El estado de fase no es válido.",
      statusCode: 400,
      details: { status, validValues: ["done", "current", "pending"] },
    }),

  // Workspace errors
  workspaceNotFound: (workspaceId: number) =>
    new AppError({
      code: "WORKSPACE_NOT_FOUND",
      message: `Workspace with id ${workspaceId} not found`,
      userMessage: "El workspace no existe o no tienes acceso a él",
      statusCode: 404,
      details: { workspaceId },
    }),

  workspaceAccessDenied: (workspaceId: number) =>
    new AppError({
      code: "WORKSPACE_ACCESS_DENIED",
      message: `Access denied to workspace ${workspaceId}`,
      userMessage: "No tienes permiso para acceder a este workspace",
      statusCode: 403,
      details: { workspaceId },
    }),

  // Auth errors
  unauthorized: () =>
    new AppError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      userMessage: "Necesitas iniciar sesión para continuar",
      statusCode: 401,
    }),

  invalidToken: () =>
    new AppError({
      code: "INVALID_TOKEN",
      message: "Invalid or expired token",
      userMessage: "Tu sesión ha expirado. Por favor, inicia sesión de nuevo.",
      statusCode: 401,
    }),

  // Validation errors
  validationError: (field: string, issue: string) =>
    new AppError({
      code: "VALIDATION_ERROR",
      message: `Validation failed for field: ${field}`,
      userMessage: `El campo "${field}" no es válido: ${issue}`,
      statusCode: 400,
      details: { field, issue },
    }),

  requiredField: (field: string) =>
    new AppError({
      code: "REQUIRED_FIELD",
      message: `Required field missing: ${field}`,
      userMessage: `El campo "${field}" es obligatorio`,
      statusCode: 400,
      details: { field },
    }),

  // Generic errors
  internalError: (message?: string) =>
    new AppError({
      code: "INTERNAL_ERROR",
      message: message ?? "An unexpected error occurred",
      userMessage: "Algo salió mal. Por favor, intenta de nuevo más tarde.",
      statusCode: 500,
    }),

  rateLimitExceeded: () =>
    new AppError({
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests",
      userMessage: "Demasiadas solicitudes. Espera un momento antes de continuar.",
      statusCode: 429,
    }),
};

/**
 * Type guard to check if error is AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: unknown): {
  error: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
} {
  if (isAppError(error)) {
    return {
      error: error.userMessage,
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  // Generic error
  const message = error instanceof Error ? error.message : "Unknown error";
  return {
    error: "Algo salió mal. Por favor, intenta de nuevo.",
    code: "UNKNOWN_ERROR",
    message,
  };
}
