export type CoordinatesE6 = { latitudeE6: number; longitudeE6: number };

export function distanceMeters(left: CoordinatesE6, right: CoordinatesE6) {
  const radians = (value: number) => value * Math.PI / 180;
  const latitudeA = radians(left.latitudeE6 / 1_000_000);
  const latitudeB = radians(right.latitudeE6 / 1_000_000);
  const deltaLatitude = latitudeB - latitudeA;
  const deltaLongitude = radians((right.longitudeE6 - left.longitudeE6) / 1_000_000);
  const h = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLongitude / 2) ** 2;
  return Math.round(6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

export function estimateCourierMinutes(distance: number, baseMinutes: number, minutesPerKm: number) {
  return Math.max(1, Math.ceil(baseMinutes + distance / 1_000 * minutesPerKm));
}
