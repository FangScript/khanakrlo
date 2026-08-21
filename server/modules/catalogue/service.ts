import * as legacyBusiness from "../../business-service";

/** Catalogue domain interface: categories, items, modifiers, and availability. */
export const catalogueService = {
  getManagedCatalogue: (userId: number) => legacyBusiness.getManagedCatalogue(userId),
  createCategory: (userId: number, input: Parameters<typeof legacyBusiness.createCatalogueCategory>[1]) => legacyBusiness.createCatalogueCategory(userId, input),
  updateCategory: (userId: number, input: Parameters<typeof legacyBusiness.updateCatalogueCategory>[1]) => legacyBusiness.updateCatalogueCategory(userId, input),
  archiveCategory: (userId: number, input: Parameters<typeof legacyBusiness.archiveCatalogueCategory>[1]) => legacyBusiness.archiveCatalogueCategory(userId, input),
  createItem: (userId: number, input: Parameters<typeof legacyBusiness.createCatalogueItem>[1]) => legacyBusiness.createCatalogueItem(userId, input),
  updateItem: (userId: number, input: Parameters<typeof legacyBusiness.updateCatalogueItem>[1]) => legacyBusiness.updateCatalogueItem(userId, input),
  archiveItem: (userId: number, input: Parameters<typeof legacyBusiness.archiveCatalogueItem>[1]) => legacyBusiness.archiveCatalogueItem(userId, input),
  createModifier: (userId: number, input: Parameters<typeof legacyBusiness.createCatalogueModifier>[1]) => legacyBusiness.createCatalogueModifier(userId, input),
  updateModifier: (userId: number, input: Parameters<typeof legacyBusiness.updateCatalogueModifier>[1]) => legacyBusiness.updateCatalogueModifier(userId, input),
  archiveModifier: (userId: number, input: Parameters<typeof legacyBusiness.archiveCatalogueModifier>[1]) => legacyBusiness.archiveCatalogueModifier(userId, input),
  setLiveStatus: (userId: number, status: "live" | "paused") => legacyBusiness.setBusinessLiveStatus(userId, status),
};
