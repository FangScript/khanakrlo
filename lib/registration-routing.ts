export function getPostGoogleRegistrationDestination(returnTo?: AuthReturnDestination): "/auth/contact" | `/auth/contact?returnTo=${string}` {
  return returnTo ? `/auth/contact?returnTo=${encodeURIComponent(returnTo)}` : "/auth/contact";
}

export type AuthReturnDestination = "/business/onboarding" | null;

export function parseAuthReturnDestination(value?: string | string[]): AuthReturnDestination {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "/business/onboarding" ? candidate : null;
}

export function getPostContactRegistrationDestination(phone: string, returnTo?: AuthReturnDestination): `/auth/location?phone=${string}${string}` {
  const suffix = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : "";
  return `/auth/location?phone=${encodeURIComponent(phone)}${suffix}`;
}
