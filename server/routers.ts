import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, adminWebProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { businessOnboardingService } from "./modules/business-onboarding/service";
import { catalogueService } from "./modules/catalogue/service";
import { businessDocumentUploadInput, businessDraftInput, businessEmergencyRestoreInput, businessEmergencySuspensionInput, businessHoursUpdateInput, businessLiveStatusInput, catalogueCategoryArchiveInput, catalogueCategoryCreateInput, catalogueCategoryUpdateInput, catalogueItemArchiveInput, catalogueItemCreateInput, catalogueItemImageUploadInput, catalogueItemUpdateInput, catalogueModifierArchiveInput, catalogueModifierCreateInput, catalogueModifierUpdateInput, deliveryZoneUpdateInput, discoveryFilterInput, liveBusinessMenuInput } from "./modules/contracts/business";
import { workspaceApplicationReviewInput, workspaceApplicationSaveInput } from "./modules/contracts/workspace";
import { discoveryService } from "./modules/discovery/service";
import { callDomain } from "./modules/gateway/domain-error";
import { identityWorkspaceService } from "./modules/identity-workspace/service";
import { orderService } from "./modules/orders/service";
import { codCollectionConfirmInput, kitchenOrderAcknowledgementInput, orderByIdInput, orderPlaceInput, orderQuoteInput, orderTransitionInput, riderAssignmentInput, riderAvailabilityInput, riderCashHistoryFilterInput, riderCashRemittanceInput, riderLocationUpdateInput, riderOfferDecisionInput, riderOrderTransitionInput, riderSettlementReceiptInput } from "./modules/contracts/orders";
import { addressService } from "./modules/addresses/service";
import { customerAddressCreateInput, customerAddressIdInput, customerAddressUpdateInput } from "./modules/contracts/addresses";
import { reviewBusinessInput, reviewCreateInput, reviewModerationInput, reviewOrderInput, reviewPhotoRemoveInput, reviewPhotoReportInput, reviewPhotoUploadInput, reviewPhotoPrivacyUpdateInput, reviewReplyInput } from "./modules/contracts/reviews";
import { reviewService } from "./modules/reviews/service";
import { notificationPreferenceUpdateInput, supportTicketCreateInput } from "./modules/contracts/support";
import * as supportService from "./support-service";
import { adminAiTriageFeedbackInput, adminAiTriageInput, adminAiTriageReviewInput, adminBulkPhotoModerationInput, adminBusinessEmergencyInput, adminCaseAssignmentInput, adminCaseDetailInput, adminOperationalCaseUpdateInput, adminPhotoReportStatusInput, adminRemittanceCaseInput, adminSlaEscalationAcknowledgeInput, adminStaffRoleProvisionInput, adminSupportTicketStatusInput } from "./modules/contracts/admin";
import * as adminService from "./admin-service";
import { getAdminWebConfiguration } from "./admin-security";
import * as adminSecurity from "./admin-security";
import { adminIpAllowlistCreateInput, adminIpAllowlistStatusInput, adminMfaCodeInput, adminSessionAuditFilterInput, adminWebSessionRevokeInput } from "./modules/contracts/admin-security";
import { TRPCError } from "@trpc/server";

const callAdminSecurity = async <T>(operation: () => Promise<T>) => {
  try { return await operation(); } catch (error) { throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Admin security validation failed." }); }
};

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  workspace: router({
    mine: protectedProcedure.query(({ ctx }) => callDomain(() => identityWorkspaceService.getWorkspaceSummaries(ctx.user.id))),
    saveApplication: protectedProcedure
      .input(workspaceApplicationSaveInput)
      .mutation(async ({ ctx, input }) => {
        const applicationId = await callDomain(() => identityWorkspaceService.saveApplication(ctx.user.id, input));
        return { applicationId };
      }),
    reviewApplication: protectedProcedure
      .input(workspaceApplicationReviewInput)
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new Error("Administrator access is required.");
        await callDomain(() => identityWorkspaceService.reviewApplication(ctx.user.id, input));
        return { success: true } as const;
      }),
  }),

  businessApplication: router({
    mine: protectedProcedure.query(({ ctx }) => callDomain(() => businessOnboardingService.getMyApplication(ctx.user.id))),
    saveDraft: protectedProcedure.input(businessDraftInput).mutation(({ ctx, input }) => callDomain(() => businessOnboardingService.saveDraft(ctx.user.id, input, false))),
    submit: protectedProcedure.input(businessDraftInput).mutation(({ ctx, input }) => callDomain(() => businessOnboardingService.saveDraft(ctx.user.id, input, true))),
    uploadDocument: protectedProcedure.input(businessDocumentUploadInput).mutation(({ ctx, input }) => callDomain(() => businessOnboardingService.uploadDocument(ctx.user.id, input))),
  }),

  businessOperations: router({
    mine: protectedProcedure.query(({ ctx }) => callDomain(() => catalogueService.getManagedCatalogue(ctx.user.id).then(({ organisation, outlets, kitchens }) => ({ organisation, outlets, kitchens })))),
    catalogue: protectedProcedure.query(({ ctx }) => callDomain(() => catalogueService.getManagedCatalogue(ctx.user.id))),
    createCategory: protectedProcedure.input(catalogueCategoryCreateInput).mutation(({ ctx, input }) => callDomain(() => catalogueService.createCategory(ctx.user.id, input))),
    updateCategory: protectedProcedure.input(catalogueCategoryUpdateInput).mutation(({ ctx, input }) => callDomain(() => catalogueService.updateCategory(ctx.user.id, input))),
    archiveCategory: protectedProcedure.input(catalogueCategoryArchiveInput).mutation(({ ctx, input }) => callDomain(() => catalogueService.archiveCategory(ctx.user.id, input))),
    createItem: protectedProcedure.input(catalogueItemCreateInput).mutation(({ ctx, input }) => callDomain(() => catalogueService.createItem(ctx.user.id, input))),
    updateItem: protectedProcedure.input(catalogueItemUpdateInput).mutation(({ ctx, input }) => callDomain(() => catalogueService.updateItem(ctx.user.id, input))),
    archiveItem: protectedProcedure.input(catalogueItemArchiveInput).mutation(({ ctx, input }) => callDomain(() => catalogueService.archiveItem(ctx.user.id, input))),
    uploadItemImage: protectedProcedure.input(catalogueItemImageUploadInput).mutation(({ ctx, input }) => callDomain(() => catalogueService.uploadItemImage(ctx.user.id, input))),
    createModifier: protectedProcedure.input(catalogueModifierCreateInput).mutation(({ ctx, input }) => callDomain(() => catalogueService.createModifier(ctx.user.id, input))),
    updateModifier: protectedProcedure.input(catalogueModifierUpdateInput).mutation(({ ctx, input }) => callDomain(() => catalogueService.updateModifier(ctx.user.id, input))),
    archiveModifier: protectedProcedure.input(catalogueModifierArchiveInput).mutation(({ ctx, input }) => callDomain(() => catalogueService.archiveModifier(ctx.user.id, input))),
    setLiveStatus: protectedProcedure.input(businessLiveStatusInput).mutation(({ ctx, input }) => callDomain(() => catalogueService.setLiveStatus(ctx.user.id, input.status))),
    deliveryZone: protectedProcedure.query(({ ctx }) => callDomain(() => catalogueService.getDeliveryZone(ctx.user.id))),
    updateDeliveryZone: protectedProcedure.input(deliveryZoneUpdateInput).mutation(({ ctx, input }) => callDomain(() => catalogueService.updateDeliveryZone(ctx.user.id, input))),
    businessHours: protectedProcedure.query(({ ctx }) => callDomain(() => catalogueService.getBusinessHours(ctx.user.id))),
    updateBusinessHours: protectedProcedure.input(businessHoursUpdateInput).mutation(({ ctx, input }) => callDomain(() => catalogueService.updateBusinessHours(ctx.user.id, input.hours))),
    publicationReadiness: protectedProcedure.query(({ ctx }) => callDomain(() => catalogueService.getPublicationReadiness(ctx.user.id))),
  }),

  discovery: router({
    liveBusinesses: publicProcedure.input(discoveryFilterInput).query(({ input }) => callDomain(() => discoveryService.getLiveBusinesses(input?.businessType))),
    liveBusinessMenu: publicProcedure.input(liveBusinessMenuInput).query(({ input }) => callDomain(() => discoveryService.getLiveBusinessMenu(input.businessId))),
  }),
  reviews: router({
    create: protectedProcedure.input(reviewCreateInput).mutation(({ ctx, input }) => callDomain(() => reviewService.create(ctx.user.id, input))),
    uploadPhoto: protectedProcedure.input(reviewPhotoUploadInput).mutation(({ ctx, input }) => callDomain(() => reviewService.uploadPhoto(ctx.user.id, input))),
    updatePhotoPrivacy: protectedProcedure.input(reviewPhotoPrivacyUpdateInput).mutation(({ ctx, input }) => callDomain(() => reviewService.updatePhotoPrivacy(ctx.user.id, input))),
    removePhoto: protectedProcedure.input(reviewPhotoRemoveInput).mutation(({ ctx, input }) => callDomain(() => reviewService.removePhoto(ctx.user.id, input))),
    reportPublicPhoto: protectedProcedure.input(reviewPhotoReportInput).mutation(({ ctx, input }) => callDomain(() => reviewService.reportPublicPhoto(ctx.user.id, input))),
    mineForOrder: protectedProcedure.input(reviewOrderInput).query(({ ctx, input }) => callDomain(() => reviewService.mineForOrder(ctx.user.id, input.orderId))),
    publicByBusiness: publicProcedure.input(reviewBusinessInput).query(({ input }) => callDomain(() => reviewService.publicByBusiness(input.businessId))),
  }),
  businessReviews: router({
    mine: protectedProcedure.query(({ ctx }) => callDomain(() => reviewService.businessMine(ctx.user.id))),
    reply: protectedProcedure.input(reviewReplyInput).mutation(({ ctx, input }) => callDomain(() => reviewService.reply(ctx.user.id, input.reviewId, input.reply))),
  }),

  orders: router({
    quote: protectedProcedure.input(orderQuoteInput).query(({ ctx, input }) => callDomain(() => orderService.quote(ctx.user.id, input))),
    place: protectedProcedure.input(orderPlaceInput).mutation(({ ctx, input }) => callDomain(() => orderService.place(ctx.user.id, input))),
    mine: protectedProcedure.query(({ ctx }) => callDomain(() => orderService.mine(ctx.user.id))),
    byId: protectedProcedure.input(orderByIdInput).query(({ ctx, input }) => callDomain(() => orderService.byId(ctx.user.id, input.orderId))),
    businessQueue: protectedProcedure.query(({ ctx }) => callDomain(() => orderService.businessQueue(ctx.user.id))),
    transition: protectedProcedure.input(orderTransitionInput).mutation(({ ctx, input }) => callDomain(() => orderService.transition(ctx.user.id, input))),
    acknowledgeKitchenOrder: protectedProcedure.input(kitchenOrderAcknowledgementInput).mutation(({ ctx, input }) => callDomain(() => orderService.acknowledgeKitchenOrder(ctx.user.id, input.orderId))),
    availableRiders: protectedProcedure.query(({ ctx }) => callDomain(() => orderService.availableRiders(ctx.user.id))),
    assignRider: protectedProcedure.input(riderAssignmentInput).mutation(({ ctx, input }) => callDomain(() => orderService.assignRider(ctx.user.id, input))),
    riderOffers: protectedProcedure.query(({ ctx }) => callDomain(() => orderService.riderOffers(ctx.user.id))),
    riderAvailability: protectedProcedure.query(({ ctx }) => callDomain(() => orderService.riderAvailability(ctx.user.id))),
    setRiderAvailability: protectedProcedure.input(riderAvailabilityInput).mutation(({ ctx, input }) => callDomain(() => orderService.setRiderAvailability(ctx.user.id, input.status))),
    riderCashCustodySummary: protectedProcedure.query(({ ctx }) => callDomain(() => orderService.riderCashCustodySummary(ctx.user.id))),
    riderCashAccount: protectedProcedure.input(riderCashHistoryFilterInput.optional()).query(({ ctx, input }) => callDomain(() => orderService.riderCashAccount(ctx.user.id, input))),
    remitRiderCash: protectedProcedure.input(riderCashRemittanceInput).mutation(({ ctx, input }) => callDomain(() => orderService.remitRiderCash(ctx.user.id, input.amountMinor))),
    riderSettlementReceipt: protectedProcedure.input(riderSettlementReceiptInput).query(({ ctx, input }) => callDomain(() => orderService.riderSettlementReceipt(ctx.user.id, input.receiptId))),
    respondToRiderOffer: protectedProcedure.input(riderOfferDecisionInput).mutation(({ ctx, input }) => callDomain(() => orderService.respondToRiderOffer(ctx.user.id, input))),
    riderQueue: protectedProcedure.query(({ ctx }) => callDomain(() => orderService.riderQueue(ctx.user.id))),
    riderTransition: protectedProcedure.input(riderOrderTransitionInput).mutation(({ ctx, input }) => callDomain(() => orderService.riderTransition(ctx.user.id, input))),
    confirmCodCollection: protectedProcedure.input(codCollectionConfirmInput).mutation(({ ctx, input }) => callDomain(() => orderService.confirmCodCollection(ctx.user.id, input))),
    updateRiderLocation: protectedProcedure.input(riderLocationUpdateInput).mutation(({ ctx, input }) => callDomain(() => orderService.updateRiderLocation(ctx.user.id, input))),
  }),
  addresses: router({
    mine: protectedProcedure.query(({ ctx }) => callDomain(() => addressService.list(ctx.user.id))),
    create: protectedProcedure.input(customerAddressCreateInput).mutation(({ ctx, input }) => callDomain(() => addressService.create(ctx.user.id, input))),
    update: protectedProcedure.input(customerAddressUpdateInput).mutation(({ ctx, input }) => callDomain(() => addressService.update(ctx.user.id, input))),
    setDefault: protectedProcedure.input(customerAddressIdInput).mutation(({ ctx, input }) => callDomain(() => addressService.setDefault(ctx.user.id, input.addressId))),
    archive: protectedProcedure.input(customerAddressIdInput).mutation(({ ctx, input }) => callDomain(() => addressService.archive(ctx.user.id, input.addressId))),
  }),
  support: router({
    mine: protectedProcedure.query(({ ctx }) => callDomain(() => supportService.listSupportTickets(ctx.user.id))),
    create: protectedProcedure.input(supportTicketCreateInput).mutation(({ ctx, input }) => callDomain(() => supportService.createSupportTicket(ctx.user.id, input))),
    notificationPreferences: protectedProcedure.query(({ ctx }) => callDomain(() => supportService.getNotificationPreferences(ctx.user.id))),
    updateNotificationPreferences: protectedProcedure.input(notificationPreferenceUpdateInput).mutation(({ ctx, input }) => callDomain(() => supportService.updateNotificationPreferences(ctx.user.id, input))),
  }),

  adminBusiness: router({
    listBusinesses: adminWebProcedure.query(() => callDomain(() => businessOnboardingService.listApplications())),
    suspend: adminWebProcedure.input(businessEmergencySuspensionInput).mutation(async ({ ctx, input }) => { await callDomain(() => businessOnboardingService.suspendBusiness(ctx.user.id, input.applicationId, input.reason)); return { success: true } as const; }),
    restore: adminWebProcedure.input(businessEmergencyRestoreInput).mutation(async ({ ctx, input }) => { await callDomain(() => businessOnboardingService.restoreBusiness(ctx.user.id, input.applicationId)); return { success: true } as const; }),
  }),
  adminReviews: router({
    moderate: adminWebProcedure.input(reviewModerationInput).mutation(({ ctx, input }) => callDomain(() => reviewService.moderate(ctx.user.id, input.reviewId, input.visibility, input.note))),
  }),
  adminOperations: router({
    queue: adminWebProcedure.query(({ ctx }) => callDomain(() => adminService.getAdminOperationalQueue(ctx.user.id))),
    caseDetail: adminWebProcedure.input(adminCaseDetailInput).query(({ ctx, input }) => callDomain(() => adminService.getAdminCaseDetail(ctx.user.id, input))),
    staffDirectory: adminWebProcedure.query(({ ctx }) => callDomain(() => adminService.listAdminStaffDirectory(ctx.user.id))),
    provisionStaffRole: adminWebProcedure.input(adminStaffRoleProvisionInput).mutation(({ ctx, input }) => callDomain(() => adminService.provisionAdminStaffRole(ctx.user.id, input))),
    updateSupportTicket: adminWebProcedure.input(adminSupportTicketStatusInput).mutation(({ ctx, input }) => callDomain(() => adminService.updateAdminSupportTicket(ctx.user.id, input))),
    updatePhotoReport: adminWebProcedure.input(adminPhotoReportStatusInput).mutation(({ ctx, input }) => callDomain(() => adminService.updateAdminPhotoReport(ctx.user.id, input))),
    suspendBusiness: adminWebProcedure.input(adminBusinessEmergencyInput).mutation(({ ctx, input }) => callDomain(() => adminService.openBusinessEmergencyCase(ctx.user.id, input))),
    restoreBusiness: adminWebProcedure.input(businessEmergencyRestoreInput).mutation(({ ctx, input }) => callDomain(() => adminService.restoreBusinessEmergency(ctx.user.id, input.applicationId))),
    openRemittanceReview: adminWebProcedure.input(adminRemittanceCaseInput).mutation(({ ctx, input }) => callDomain(() => adminService.openRemittanceReviewCase(ctx.user.id, input))),
    updateCase: adminWebProcedure.input(adminOperationalCaseUpdateInput).mutation(({ ctx, input }) => callDomain(() => adminService.updateAdminOperationalCase(ctx.user.id, input))),
    assignCase: adminWebProcedure.input(adminCaseAssignmentInput).mutation(({ ctx, input }) => callDomain(() => adminService.assignAdminOperationalCase(ctx.user.id, input))),
    acknowledgeSlaEscalation: adminWebProcedure.input(adminSlaEscalationAcknowledgeInput).mutation(({ ctx, input }) => callDomain(() => adminService.acknowledgeAdminSlaEscalation(ctx.user.id, input.escalationId))),
    bulkModeratePhotoReports: adminWebProcedure.input(adminBulkPhotoModerationInput).mutation(({ ctx, input }) => callDomain(() => adminService.bulkModerateAdminPhotoReports(ctx.user.id, input))),
    runAiTriage: adminWebProcedure.input(adminAiTriageInput).mutation(({ ctx, input }) => callDomain(() => adminService.runAdminAiTriage(ctx.user.id, input))),
    reviewAiTriage: adminWebProcedure.input(adminAiTriageReviewInput).mutation(({ ctx, input }) => callDomain(() => adminService.reviewAdminAiTriage(ctx.user.id, input))),
    submitAiTriageFeedback: adminWebProcedure.input(adminAiTriageFeedbackInput).mutation(({ ctx, input }) => callDomain(() => adminService.submitAdminAiTriageFeedback(ctx.user.id, input))),
    aiTriageQualityMetrics: adminWebProcedure.query(({ ctx }) => callDomain(() => adminService.getAdminAiTriageQualityMetrics(ctx.user.id))),
  }),
  adminSecurity: router({
    webConfiguration: adminProcedure.query(() => getAdminWebConfiguration()),
    status: adminProcedure.query(({ ctx }) => callAdminSecurity(() => adminSecurity.getAdminSecurityStatus(ctx.user.id, ctx.req))),
    beginMfaEnrollment: adminProcedure.mutation(({ ctx }) => callAdminSecurity(() => adminSecurity.beginAdminMfaEnrollment(ctx.user.id, ctx.req))),
    confirmMfaEnrollment: adminProcedure.input(adminMfaCodeInput).mutation(async ({ ctx, input }) => { const result = await callAdminSecurity(() => adminSecurity.confirmAdminMfaEnrollment(ctx.user.id, ctx.req, input.code)); adminSecurity.setAdminMfaCookie(ctx.res, ctx.req, result.token, result.expiresAt); return { recoveryCodes: result.recoveryCodes, expiresAt: result.expiresAt }; }),
    verifyMfaChallenge: adminProcedure.input(adminMfaCodeInput).mutation(async ({ ctx, input }) => { const result = await callAdminSecurity(() => adminSecurity.verifyAdminMfaChallenge(ctx.user.id, ctx.req, input.code)); adminSecurity.setAdminMfaCookie(ctx.res, ctx.req, result.token, result.expiresAt); return { expiresAt: result.expiresAt }; }),
    allowlist: adminWebProcedure.query(({ ctx }) => callAdminSecurity(() => adminSecurity.listAdminIpAllowlist(ctx.user.id))),
    createAllowlistRule: adminWebProcedure.input(adminIpAllowlistCreateInput).mutation(({ ctx, input }) => callAdminSecurity(() => adminSecurity.createAdminIpAllowlistRule(ctx.user.id, input))),
    updateAllowlistRule: adminWebProcedure.input(adminIpAllowlistStatusInput).mutation(({ ctx, input }) => callAdminSecurity(() => adminSecurity.updateAdminIpAllowlistRule(ctx.user.id, input))),
    sessionAudit: adminWebProcedure.input(adminSessionAuditFilterInput.optional()).query(({ ctx, input }) => callAdminSecurity(() => adminSecurity.getAdminSessionAudit(ctx.user.id, input))),
    revokeSession: adminWebProcedure.input(adminWebSessionRevokeInput).mutation(({ ctx, input }) => callAdminSecurity(() => adminSecurity.revokeAdminWebSession(ctx.user.id, input.sessionId))),
  }),

});

export type AppRouter = typeof appRouter;
