/**
 * Security middleware for tRPC procedures
 */

import { TRPCError } from "@trpc/server";
import { RateLimiter, logAuditEvent, createAuditLog, sanitizeInput } from "./security";

// Global rate limiters
const globalRateLimiter = new RateLimiter(60000, 100); // 100 requests per minute
const warningsRateLimiter = new RateLimiter(60000, 10); // 10 requests per minute for warnings operations
const chatRateLimiter = new RateLimiter(60000, 20); // 20 requests per minute for chat

/**
 * Check rate limiting
 */
export const checkRateLimit = (
  userId: number,
  limiter: RateLimiter,
  operation: string
): void => {
  const key = `${userId}:${operation}`;

  if (!limiter.isAllowed(key)) {
    const remaining = limiter.getRemainingRequests(key);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Muitas requisições. Tente novamente em alguns segundos. (${remaining} requisições restantes)`,
    });
  }
};

/**
 * Check global rate limit
 */
export const checkGlobalRateLimit = (userId: number): void => {
  const key = `global:${userId}`;

  if (!globalRateLimiter.isAllowed(key)) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Limite de requisições global atingido. Tente novamente em alguns segundos.",
    });
  }
};

/**
 * Check role-based access
 */
export const checkRoleAccess = (
  userRole: string,
  requiredRoles: string[],
  operation: string
): void => {
  if (!requiredRoles.includes(userRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Acesso negado para operação: ${operation}. Roles necessárias: ${requiredRoles.join(", ")}`,
    });
  }
};

/**
 * Log sensitive operation
 */
export const logSensitiveOperation = (
  userId: number,
  userEmail: string,
  action: string,
  resource: string,
  resourceId: number | string | undefined,
  details?: Record<string, any>,
  status: "success" | "failure" = "success",
  errorMessage?: string
): void => {
  const auditLog = createAuditLog({
    userId,
    userEmail,
    action,
    resource,
    resourceId,
    details,
    status,
    errorMessage,
  });

  logAuditEvent(auditLog);
};

/**
 * Validate input for security
 */
export const validateSecurityInput = (input: string, maxLength: number = 500): string => {
  if (!input || typeof input !== "string") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Input inválido",
    });
  }

  if (input.length > maxLength) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Input muito longo. Máximo: ${maxLength} caracteres`,
    });
  }

  return sanitizeInput.command(input);
};

/**
 * Middleware factory for security checks
 */
export const createSecurityMiddleware = (options: {
  requireRole?: string[];
  rateLimit?: "global" | "warnings" | "chat";
  logOperation?: boolean;
  maxInputLength?: number;
}) => {
  return async (opts: any) => {
    const { ctx, next } = opts;

    // Check role access if required
    if (options.requireRole) {
      checkRoleAccess(ctx.user.role, options.requireRole, opts.path);
    }

    // Check rate limiting
    if (options.rateLimit === "global") {
      checkGlobalRateLimit(ctx.user.id);
    } else if (options.rateLimit === "warnings") {
      checkRateLimit(ctx.user.id, warningsRateLimiter, "warnings");
    } else if (options.rateLimit === "chat") {
      checkRateLimit(ctx.user.id, chatRateLimiter, "chat");
    }

    // Continue to next middleware/procedure
    const result = await next({ ctx });

    // Log operation if requested
    if (options.logOperation) {
      logSensitiveOperation(
        ctx.user.id,
        ctx.user.email,
        opts.path,
        opts.path.split(".")[0],
        undefined,
        { procedure: opts.path },
        "success"
      );
    }

    return result;
  };
};

/**
 * Export rate limiters and security utilities for use in procedures
 */
export { globalRateLimiter, warningsRateLimiter, chatRateLimiter, sanitizeInput };
