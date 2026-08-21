import * as legacyBusiness from "../../business-service";
import type { BusinessApplicationDraft } from "../../../shared/business";

/**
 * Business onboarding and compliance boundary. Router callers do not access
 * the legacy aggregate implementation directly, which permits later extraction
 * without changing the mobile gateway contract.
 */
export const businessOnboardingService = {
  getMyApplication: (userId: number) => legacyBusiness.getMyBusinessApplication(userId),
  saveDraft: (userId: number, input: BusinessApplicationDraft, submit: boolean) => legacyBusiness.saveBusinessDraft(userId, input, submit),
  uploadDocument: (userId: number, input: { documentType: Parameters<typeof legacyBusiness.uploadBusinessDocument>[1]["documentType"]; originalName: string; mimeType: string; dataBase64: string }) => legacyBusiness.uploadBusinessDocument(userId, input),
  listApplications: () => legacyBusiness.listBusinessApplications(),
  reviewApplication: (reviewerUserId: number, applicationId: number, status: "changes_required" | "approved" | "suspended", reviewNote?: string) => legacyBusiness.reviewBusinessApplication(reviewerUserId, applicationId, status, reviewNote),
};
