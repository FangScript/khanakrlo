import { ApiError, type Transport } from "./http";

const id = "237c702d-f464-4e19-bd1f-8b02a575180a";
let phone = "+••••••••••4567";
let consentAt = "2026-10-12T00:00:00.000Z";
// In-memory preview only. This transport never sends a network request.
export const sandboxTransport: Transport = async <T>(path: string, options = {}): Promise<T> => {
  if (!__DEV__ || process.env.EXPO_PUBLIC_SANDBOX !== "1") throw new Error("Sandbox is disabled.");
  const request = options as import("./http").RequestOptions;
  if (request.signal?.aborted) throw new Error("Request cancelled.");
  let result: unknown;
  if (path === "/identity/sessions/google" || path === "/identity/sessions/refresh") {
    result = { accessToken: "sandbox-access-token-never-accepted-by-server", refreshToken: "sandbox-refresh-token-never-accepted-by-server-0000000000000000", accessExpiresAt: new Date(Date.now()+3600000).toISOString(), user: { id, roles: ["customer","merchant","rider"] } };
  } else if (path === "/identity/sessions/logout") result = { revoked: true };
  else if (path === "/customer/profile") result = { id, displayName: "Sandbox customer", phone, phoneConsentAt: consentAt };
  else if (path === "/customer/profile/phone-consent" && request.method === "PUT") {
    const input = request.body as { phone?: string; consent?: boolean };
    if (!input.consent || !/^\+[1-9]\d{7,14}$/.test(input.phone ?? "")) throw new ApiError(400,"INVALID_REQUEST","Enter a sample international phone number and accept consent.");
    phone = `+••••••••••${input.phone!.slice(-4)}`;
    consentAt = new Date().toISOString();
    result = { phone, phoneConsentAt: consentAt };
  } else if (path === "/payment/cod/custody") result = { riderId: id, outstandingPaisa: 125000, custodyLimitPaisa: 500000 };
  else throw new ApiError(501,"SANDBOX_NOT_IMPLEMENTED","This workflow is not available in the sandbox yet.");
  return result as T;
};
