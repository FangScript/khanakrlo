import * as legacyBusiness from "../../business-service";

/** Discovery owns customer-facing Business projections and filters. */
export const discoveryService = {
  getLiveBusinesses: (businessType?: "restaurant" | "cloud_kitchen") => legacyBusiness.getLiveBusinessDiscovery(businessType),
};
