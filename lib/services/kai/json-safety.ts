export function sanitizeJsonForPrisma(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeJsonForPrisma(item))
      .filter((item) => item !== undefined);
  }

  if (typeof value === "object") {
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      return undefined;
    }

    const sanitized: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      const sanitizedItem = sanitizeJsonForPrisma(item);

      if (sanitizedItem !== undefined) {
        sanitized[key] = sanitizedItem;
      }
    }

    return sanitized;
  }

  return undefined;
}

export function sanitizeObjectForResponse<T>(value: T): T {
  return sanitizeJsonForPrisma(value) as T;
}
