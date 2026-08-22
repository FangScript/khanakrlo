export function getPostGoogleRegistrationDestination(): "/auth/phone" {
  return "/auth/phone";
}

export type AuthReturnDestination = "/business/onboarding" | null;

export function parseAuthReturnDestination(value?: string | string[]): AuthReturnDestination {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "/business/onboarding" ? candidate : null;
}

export function getPhoneVerificationDestination(phone: string, returnTo?: AuthReturnDestination): `/auth/verify?phone=${string}${string}` {
  const suffix = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : "";
  return `/auth/verify?phone=${encodeURIComponent(phone)}${suffix}`;
}

export function getPostOtpRegistrationDestination(phone: string, returnTo?: AuthReturnDestination): `/auth/location?phone=${string}${string}` {
  const suffix = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : "";
  return `/auth/location?phone=${encodeURIComponent(phone)}${suffix}`;
}
