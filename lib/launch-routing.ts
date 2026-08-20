export function getCustomerLaunchDestination(hasCustomerProfile: boolean) {
  return hasCustomerProfile ? "/(tabs)" : "/auth/login";
}
