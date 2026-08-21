import { TRPCError } from "@trpc/server";

export type DomainErrorCode = "VALIDATION" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "UNAVAILABLE" | "INTERNAL";

export class DomainError extends Error {
  constructor(public readonly code: DomainErrorCode, message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "DomainError";
  }
}

export function mapDomainError(error: unknown): TRPCError {
  if (error instanceof TRPCError) return error;
  if (error instanceof DomainError) {
    const codeByDomain: Record<DomainErrorCode, TRPCError["code"]> = {
      VALIDATION: "BAD_REQUEST", FORBIDDEN: "FORBIDDEN", NOT_FOUND: "NOT_FOUND", CONFLICT: "CONFLICT", UNAVAILABLE: "SERVICE_UNAVAILABLE", INTERNAL: "INTERNAL_SERVER_ERROR",
    };
    return new TRPCError({ code: codeByDomain[error.code], message: error.message, cause: error.cause });
  }
  const message = error instanceof Error ? error.message : "An unexpected domain error occurred.";
  const normalized = message.toLowerCase();
  if (normalized.includes("unavailable")) return new TRPCError({ code: "SERVICE_UNAVAILABLE", message });
  if (normalized.includes("required") || normalized.includes("invalid") || normalized.includes("must ")) return new TRPCError({ code: "BAD_REQUEST", message });
  if (normalized.includes("outside your") || normalized.includes("administrator access")) return new TRPCError({ code: "FORBIDDEN", message });
  if (normalized.includes("not found")) return new TRPCError({ code: "NOT_FOUND", message });
  if (normalized.includes("cannot") || normalized.includes("already")) return new TRPCError({ code: "CONFLICT", message });
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
}

export async function callDomain<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapDomainError(error);
  }
}
