export function normalizePakistaniMobile(value: string) {
  return value.replace(/\D/g, "").replace(/^92/, "").slice(0, 10);
}

export function isValidPakistaniMobile(phone: string) {
  return /^3\d{9}$/.test(phone);
}

export function formatDeliveryAddress(area: string, city = "Islamabad") {
  const normalizedArea = area.trim().replace(/\s+/g, " ");
  if (!normalizedArea) return "";
  return normalizedArea.toLowerCase().endsWith(city.toLowerCase()) ? normalizedArea : `${normalizedArea}, ${city}`;
}
