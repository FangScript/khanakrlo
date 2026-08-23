import { createHash } from "node:crypto";

import { ENV } from "./_core/env";
import { distanceMeters, type CoordinatesE6 } from "../shared/delivery";

export type DeliveryRouteResult = {
  status: "estimated" | "provider_unavailable" | "failed";
  provider: "google_routes" | "none";
  routeRevision: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
  etaMinutes: number | null;
  encodedPolyline: string | null;
  metadata: { reason?: string; directDistanceMeters?: number };
};

function revision(origin: CoordinatesE6, destination: CoordinatesE6) {
  return createHash("sha256").update(`${origin.latitudeE6}:${origin.longitudeE6}:${destination.latitudeE6}:${destination.longitudeE6}`).digest("hex").slice(0, 32);
}

function point(value: CoordinatesE6) {
  return { latitude: value.latitudeE6 / 1_000_000, longitude: value.longitudeE6 / 1_000_000 };
}

export function deliveryProviderReadiness() {
  return {
    routesProvider: ENV.googleMapsServerApiKey ? "google_routes_configured" as const : "google_routes_unconfigured" as const,
    liveStateProvider: ENV.redisUrl ? "redis_configured" as const : "redis_unconfigured" as const,
  };
}

/** Computes an advisory route with a server-only key. The caller must separately enforce delivery ownership. */
export async function computeDeliveryRoute(origin: CoordinatesE6, destination: CoordinatesE6): Promise<DeliveryRouteResult> {
  const routeRevision = revision(origin, destination);
  const directDistanceMeters = distanceMeters(origin, destination);
  if (!ENV.googleMapsServerApiKey) return { status: "provider_unavailable", provider: "none", routeRevision, distanceMeters: null, durationSeconds: null, etaMinutes: null, encodedPolyline: null, metadata: { reason: "Google Routes is not configured.", directDistanceMeters } };
  try {
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": ENV.googleMapsServerApiKey, "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline" },
      body: JSON.stringify({ origin: { location: { latLng: point(origin) } }, destination: { location: { latLng: point(destination) } }, travelMode: "DRIVE", routingPreference: "TRAFFIC_AWARE" }),
    });
    if (!response.ok) return { status: "failed", provider: "google_routes", routeRevision, distanceMeters: null, durationSeconds: null, etaMinutes: null, encodedPolyline: null, metadata: { reason: `Google Routes returned ${response.status}.`, directDistanceMeters } };
    const payload = await response.json() as { routes?: Array<{ duration?: string; distanceMeters?: number; polyline?: { encodedPolyline?: string } }> };
    const route = payload.routes?.[0];
    const durationSeconds = route?.duration ? Number.parseInt(route.duration.replace("s", ""), 10) : NaN;
    if (!route || !Number.isFinite(durationSeconds) || !Number.isFinite(route.distanceMeters)) return { status: "failed", provider: "google_routes", routeRevision, distanceMeters: null, durationSeconds: null, etaMinutes: null, encodedPolyline: null, metadata: { reason: "Google Routes returned no usable route.", directDistanceMeters } };
    return { status: "estimated", provider: "google_routes", routeRevision, distanceMeters: route.distanceMeters!, durationSeconds, etaMinutes: Math.max(1, Math.ceil(durationSeconds / 60)), encodedPolyline: route.polyline?.encodedPolyline ?? null, metadata: { directDistanceMeters } };
  } catch {
    return { status: "failed", provider: "google_routes", routeRevision, distanceMeters: null, durationSeconds: null, etaMinutes: null, encodedPolyline: null, metadata: { reason: "Google Routes could not be reached.", directDistanceMeters } };
  }
}
