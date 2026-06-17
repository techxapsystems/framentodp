/**
 * Security utilities for data masking, sanitization, and protection
 */

/**
 * Mask sensitive data fields
 */
export const maskSensitiveData = {
  /**
   * Mask CPF: "123.456.789-00" -> "XXX.XXX.XXX-00"
   */
  cpf: (cpf: string | null | undefined): string => {
    if (!cpf) return "***";
    return cpf.replace(/^\d{3}\.\d{3}\.\d{3}/, "XXX.XXX.XXX");
  },

  /**
   * Mask Matrícula: "12345" -> "***45"
   */
  matricula: (matricula: string | null | undefined): string => {
    if (!matricula || matricula.length < 2) return "***";
    return "*".repeat(matricula.length - 2) + matricula.slice(-2);
  },

  /**
   * Mask Placa: "ABC-1234" -> "ABC-****"
   */
  placa: (placa: string | null | undefined): string => {
    if (!placa) return "***";
    const parts = placa.split("-");
    if (parts.length === 2) {
      return parts[0] + "-****";
    }
    return placa.substring(0, 3) + "****";
  },

  /**
   * Mask Email: "user@example.com" -> "u***@example.com"
   */
  email: (email: string | null | undefined): string => {
    if (!email) return "***";
    const [local, domain] = email.split("@");
    if (!domain) return "***";
    return local.charAt(0) + "*".repeat(local.length - 1) + "@" + domain;
  },

  /**
   * Mask Phone: "11987654321" -> "119****4321"
   */
  phone: (phone: string | null | undefined): string => {
    if (!phone || phone.length < 4) return "***";
    return phone.substring(0, 3) + "****" + phone.slice(-4);
  },
};

/**
 * Sanitize input to prevent XSS attacks
 */
export const sanitizeInput = {
  /**
   * Remove HTML/script tags and dangerous characters
   */
  text: (input: string): string => {
    if (!input) return "";
    return input
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/[<>\"']/g, "") // Remove dangerous characters
      .trim();
  },

  /**
   * Sanitize command input (for chat commands)
   */
  command: (input: string): string => {
    if (!input) return "";
    return input
      .replace(/[<>\"'`]/g, "") // Remove dangerous characters
      .replace(/\n\n+/g, "\n") // Remove multiple newlines
      .trim();
  },

  /**
   * Sanitize SQL-like input
   */
  sqlSafe: (input: string): string => {
    if (!input) return "";
    return input
      .replace(/[;'\"\\]/g, "") // Remove SQL dangerous characters
      .replace(/--/g, "") // Remove SQL comments
      .trim();
  },

  /**
   * Sanitize driver name (allow only letters, numbers, spaces, hyphens)
   */
  driverName: (input: string): string => {
    if (!input) return "";
    return input
      .replace(/[^a-zA-Z0-9\s\-\.]/g, "") // Keep only safe characters
      .replace(/\s+/g, " ") // Normalize spaces
      .trim()
      .toUpperCase();
  },
};

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const recentRequests = userRequests.filter((time) => now - time < this.windowMs);

    if (recentRequests.length >= this.maxRequests) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(key, recentRequests);

    return true;
  }

  getRemainingRequests(key: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    const recentRequests = userRequests.filter((time) => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - recentRequests.length);
  }

  reset(key: string): void {
    this.requests.delete(key);
  }
}

/**
 * Audit logging helper
 */
export interface AuditLog {
  timestamp: Date;
  userId: number;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: number | string;
  details?: Record<string, any>;
  ipAddress?: string;
  status: "success" | "failure";
  errorMessage?: string;
}

export const createAuditLog = (data: Omit<AuditLog, "timestamp">): AuditLog => {
  return {
    ...data,
    timestamp: new Date(),
  };
};

/**
 * Log audit event to console and potentially to database
 */
export const logAuditEvent = (log: AuditLog): void => {
  const logMessage = `[AUDIT] ${log.timestamp.toISOString()} | User: ${log.userEmail} (${log.userId}) | Action: ${log.action} | Resource: ${log.resource}${log.resourceId ? `/${log.resourceId}` : ""} | Status: ${log.status}${log.errorMessage ? ` | Error: ${log.errorMessage}` : ""}`;

  if (log.status === "failure") {
    console.error(logMessage);
  } else {
    console.log(logMessage);
  }

  // TODO: Send to audit database/service
};

/**
 * Validate CSRF token
 */
export const validateCsrfToken = (token: string, sessionToken: string): boolean => {
  // Simple comparison - in production, use more sophisticated methods
  return token === sessionToken;
};

/**
 * Check if user has permission to access resource
 */
export const checkPermission = (
  userRole: string,
  requiredRoles: string[]
): boolean => {
  return requiredRoles.includes(userRole);
};

/**
 * Encrypt sensitive data (basic implementation)
 * In production, use proper encryption library
 */
export const encryptData = (data: string, key: string): string => {
  // This is a placeholder - use proper encryption in production
  // For now, just base64 encode as example
  return Buffer.from(data).toString("base64");
};

/**
 * Decrypt sensitive data (basic implementation)
 */
export const decryptData = (encrypted: string, key: string): string => {
  // This is a placeholder - use proper decryption in production
  try {
    return Buffer.from(encrypted, "base64").toString("utf-8");
  } catch {
    return "";
  }
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate CPF format
 */
export const isValidCpf = (cpf: string): boolean => {
  const cleanCpf = cpf.replace(/\D/g, "");
  return cleanCpf.length === 11 && /^\d+$/.test(cleanCpf);
};

/**
 * Generate secure random token
 */
export const generateSecureToken = (length: number = 32): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};
