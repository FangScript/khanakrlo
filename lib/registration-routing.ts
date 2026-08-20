export function getPostGoogleRegistrationDestination(): "/auth/phone" {
  return "/auth/phone";
}

export function getPostOtpRegistrationDestination(phone: string): `/auth/location?phone=${string}` {
  return `/auth/location?phone=${encodeURIComponent(phone)}`;
}
