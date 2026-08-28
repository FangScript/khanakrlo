import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminCredentialProcedure, adminCredentialWebProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { businessOnboardingService } from "./modules/business-onboarding/service";
import { catalogueService } from "./modules/catalogue/service";
import { businessDocumentUploadInput, businessDraftInput, businessEmergencyRestoreInput, businessEmergencySuspensionInput, businessHoursUpdateInput, businessLiveStatusInput, catalogueCategoryArchiveInput, catalogueCategoryCreateInput, catalogueCategoryUpdateInput, catalogueItemArchiveInput, catalogueItemCreateInput, catalogueItemImageUploadInput, catalogueItemUpdateInput, catalogueModifierArchiveInput, catalogueModifierCreateInput, catalogueModifierUpdateInput, deliveryZoneUpdateInput, discoveryFilterInput, liveBusinessMenuInput } from "./modules/contracts/business";
import { workspaceApplicationReviewInput, workspaceApplicationSaveInput } from "./modules/contracts/workspace";
import { discoveryService } from "./modules/discovery/service";
import { callDomain } from "./modules/gateway/domain-error";
import { identityWorkspaceService } from "./modules/identity-workspace/service";
import { orderService } from "./modules/orders/service";
import { codCollectionConfirmInput, deliveryRouteInput, dispatchRecommendationInput, kitchenOrderAcknowledgementInput, orderByIdInput, orderPlaceInput, orderQuoteInput, orderTransitionInput, riderAssignmentInput, riderAvailabilityInput, riderCashHistoryFilterInput, riderCashRemittanceInput, riderCommandInput, riderLocationUpdateInput, riderOfferDecisionInput, riderOrderTransitionInput, riderSettlementReceiptInput, riderTrackingStartInput, riderTrackingStateInput } from "./modules/contracts/orders";
import { addressService } from "./modules/addresses/service";
import { customerAddressCreateInput, customerAddressIdInput, customerAddressUpdateInput } from "./modules/contracts/addresses";
import { reviewBusinessInput, reviewCreateInput, reviewModerationInput, reviewOrderInput, reviewPhotoRemoveInput, reviewPhotoReportInput, reviewPhotoUploadInput, reviewPhotoPrivacyUpdateInput, reviewReplyInput } from "./modules/contracts/reviews";
import { reviewService } from "./modules/reviews/service";
import { notificationPreferenceUpdateInput, refundRequestCreateInput, supportMessageCreateInput, supportTicketCreateInput, supportTicketIdInput } from "./modules/contracts/support";
import * as supportService from "./support-service";
import { expoDeviceTokenRegistrationInput, notificationIdInput } from "./modules/contracts/notifications";
import * as notificationService from "./notification-service";
import { adminAiTriageFeedbackInput, adminAiTriageInput, adminAiTriageReviewInput, adminBulkPhotoModerationInput, adminBusinessEmergencyInput, adminCaseAssignmentInput, adminCaseDetailInput, adminOperationalCaseUpdateInput, adminPhotoReportStatusInput, adminRefundDecisionInput, adminRemittanceCaseInput, adminSlaEscalationAcknowledgeInput, adminStaffRoleProvisionInput, adminSupportTicketStatusInput } from "./modules/contracts/admin";
import * as adminService from "./admin-service";
import { getAdminWebConfiguration } from "./admin-security";
import * as adminSecurity from "./admin-security";
import { adminIpAllowlistCreateInput, adminIpAllowlistStatusInput, adminMfaCodeInput, adminSessionAuditFilterInput, adminWebSessionRevokeInput } from "./modules/contracts/admin-security";
import { adminCredentialProvisionInput, adminCredentialSignInInput } from "./modules/contracts/admin-credentials";
import * as adminCredentials from "./admin-credentials";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { updateAccountProfile } from "./db";

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

  account: router({
    saveContact: protectedProcedure.input(z.object({
      phoneE164: z.string().regex(/^\+923\d{9}$/, "Enter a valid Pakistan mobile number."),
      contactConsent: z.literal(true),
    })).mutation(async ({ ctx, input }) => {
      await updateAccountProfile(ctx.user.id, { phoneE164: input.phoneE164, phoneVerified: false, contactConsent: input.contactConsent });
      return { success: true, phoneVerified: false } as const;
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
    deliveryRoute: protectedProcedure.input(deliveryRouteInput).query(({ ctx, input }) => callDomain(() => orderService.deliveryRoute(ctx.user.id, input.orderId))),
    businessQueue: protectedProcedure.query(({ ctx }) => callDomain(() => orderService.businessQueue(ctx.user.id))),
    transition: protectedProcedure.input(orderTransitionInput).mutation(({ ctx, input }) => callDomain(() => orderService.transition(ctx.user.id, input))),
    acknowledgeKitchenOrder: protectedProcedure.input(kitchenOrderAcknowledgementInput).mutation(({ ctx, input }) => callDomain(() => orderService.acknowledgeKitchenOrder(ctx.user.id, input.orderId))),
    availableRiders: protectedProcedure.query(({ ctx }) => callDomain(() => orderService.availableRiders(ctx.user.id))),
    dispatchRecommendations: protectedProcedure.input(dispatchRecommendationInput).query(({ ctx, input }) => callDomain(() => orderService.dispatchRecommendations(ctx.user.id, input.orderId))),
    offerRecommendedRider: protectedProcedure.input(dispatchRecommendationInput).mutation(({ ctx, input }) => callDomain(() => orderService.offerRecommendedRider(ctx.user.id, input.orderId))),
    businessStatement: protectedProcedure.query(({ ctx }) => callDomain(() => orderService.businessStatement(ctx.user.id))),
    assignRider: protectedProcedure.input(riderAssignmentInput).mutation(({ ctx, input }) => callDomain(() => orderService.assignRider(ctx.user.id, input))),
    riderOffers: protectedProcedure.query(({ ctx }) => callDomain(() => orderService.riderOffers(ctx.user.id))),
    riderAvailability: protectedProcedure.query(({ ctx }) => callDomain(() => orderService.riderAvailability(ctx.user.id))),
    setRiderAvailability: protectedProcedure.input(riderAvailabilityInput).mutation(({ ctx, input }) => callDomain(() => orderService.setRiderAvailability(ctx.user.id, input.status))),
    riderCashCustodySummary: protectedProcedure.query(({ ctx }) => callDomain(() => orderService.riderCashCustodySummary(ctx.user.id))),
    riderCashAccount: protectedProcedure.input(riderCashHistoryFilterInput.optional()).query(({ ctx, input }) => callDomain(() => orderService.riderCashAccount(ctx.user.id, input))),
    riderStatement: protectedProcedure.query(({ ctx }) => callDomain(() => orderService.riderStatement(ctx.user.id))),
    remitRiderCash: protectedProcedure.input(riderCashRemittanceInput).mutation(({ ctx, input }) => callDomain(() => orderService.remitRiderCash(ctx.user.id, input.amountMinor))),
    riderSettlementReceipt: protectedProcedure.input(riderSettlementReceiptInput).query(({ ctx, input }) => callDomain(() => orderService.riderSettlementReceipt(ctx.user.id, input.receiptId))),
    respondToRiderOffer: protectedProcedure.input(riderOfferDecisionInput).mutation(({ ctx, input }) => callDomain(() => orderService.respondToRiderOffer(ctx.user.id, input))),
    riderQueue: protectedProcedure.query(({ ctx }) => callDomain(() => orderService.riderQueue(ctx.user.id))),
    riderTransition: protectedProcedure.input(riderOrderTransitionInput).mutation(({ ctx, input }) => callDomain(() => orderService.riderTransition(ctx.user.id, input))),
    confirmCodCollection: protectedProcedure.input(codCollectionConfirmInput).mutation(({ ctx, input }) => callDomain(() => orderService.confirmCodCollection(ctx.user.id, input))),
    riderTrackingSession: protectedProcedure.input(riderTrackingStartInput).query(({ ctx, input }) => callDomain(() => orderService.riderTrackingSession(ctx.user.id, input.orderId))),
    startRiderTracking: protectedProcedure.input(riderTrackingStartInput).mutation(({ ctx, input }) => callDomain(() => orderService.startRiderTracking(ctx.user.id, input.orderId))),
    setRiderTrackingState: protectedProcedure.input(riderTrackingStateInput).mutation(({ ctx, input }) => callDomain(() => orderService.setRiderTrackingState(ctx.user.id, input))),
    updateRiderLocation: protectedProcedure.input(riderLocationUpdateInput).mutation(({ ctx, input }) => callDomain(() => orderService.updateRiderLocation(ctx.user.id, { ...input, deviceObservedAt: input.deviceObservedAt ? new Date(input.deviceObservedAt) : undefined }))),
    executeRiderCommand: protectedProcedure.input(riderCommandInput).mutation(({ ctx, input }) => callDomain(() => orderService.executeRiderCommand(ctx.user.id, input))),
  }),
  notifications: router({
    mine: protectedProcedure.query(({ ctx }) => callDomain(() => notificationService.listMyNotifications(ctx.user.id))),
    registerExpoDevice: protectedProcedure.input(expoDeviceTokenRegistrationInput).mutation(({ ctx, input }) => callDomain(() => notificationService.registerExpoDeviceToken(ctx.user.id, input))),
    markRead: protectedProcedure.input(notificationIdInput).mutation(({ ctx, input }) => callDomain(() => notificationService.markMyNotificationRead(ctx.user.id, input.notificationId))),
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
    byId: protectedProcedure.input(supportTicketIdInput).query(({ ctx, input }) => callDomain(() => supportService.getSupportTicket(ctx.user.id, input.ticketId))),
    create: protectedProcedure.input(supportTicketCreateInput).mutation(({ ctx, input }) => callDomain(() => supportService.createSupportTicket(ctx.user.id, input))),
    reply: protectedProcedure.input(supportMessageCreateInput).mutation(({ ctx, input }) => callDomain(() => supportService.addCustomerSupportMessage(ctx.user.id, input))),
    requestRefund: protectedProcedure.input(refundRequestCreateInput).mutation(({ ctx, input }) => callDomain(() => supportService.createRefundRequest(ctx.user.id, input))),
    notificationPreferences: protectedProcedure.query(({ ctx }) => callDomain(() => supportService.getNotificationPreferences(ctx.user.id))),
    updateNotificationPreferences: protectedProcedure.input(notificationPreferenceUpdateInput).mutation(({ ctx, input }) => callDomain(() => supportService.updateNotificationPreferences(ctx.user.id, input))),
  }),

  adminBusiness: router({
    listBusinesses: adminCredentialWebProcedure.query(() => callDomain(() => businessOnboardingService.listApplications())),
    suspend: adminCredentialWebProcedure.input(businessEmergencySuspensionInput).mutation(async ({ ctx, input }) => { await callDomain(() => businessOnboardingService.suspendBusiness(ctx.user!.id, input.applicationId, input.reason)); return { success: true } as const; }),
    restore: adminCredentialWebProcedure.input(businessEmergencyRestoreInput).mutation(async ({ ctx, input }) => { await callDomain(() => businessOnboardingService.restoreBusiness(ctx.user!.id, input.applicationId)); return { success: true } as const; }),
  }),
  adminReviews: router({
    moderate: adminCredentialWebProcedure.input(reviewModerationInput).mutation(({ ctx, input }) => callDomain(() => reviewService.moderate(ctx.user!.id, input.reviewId, input.visibility, input.note))),
  }),
  adminOperations: router({
    queue: adminCredentialWebProcedure.query(({ ctx }) => callDomain(() => adminService.getAdminOperationalQueue(ctx.user!.id))),
    caseDetail: adminCredentialWebProcedure.input(adminCaseDetailInput).query(({ ctx, input }) => callDomain(() => adminService.getAdminCaseDetail(ctx.user!.id, input))),
    staffDirectory: adminCredentialWebProcedure.query(({ ctx }) => callDomain(() => adminService.listAdminStaffDirectory(ctx.user!.id))),
    provisionStaffRole: adminCredentialWebProcedure.input(adminStaffRoleProvisionInput).mutation(({ ctx, input }) => callDomain(() => adminService.provisionAdminStaffRole(ctx.user!.id, input))),
    updateSupportTicket: adminCredentialWebProcedure.input(adminSupportTicketStatusInput).mutation(({ ctx, input }) => callDomain(() => adminService.updateAdminSupportTicket(ctx.user!.id, input))),
    updatePhotoReport: adminCredentialWebProcedure.input(adminPhotoReportStatusInput).mutation(({ ctx, input }) => callDomain(() => adminService.updateAdminPhotoReport(ctx.user!.id, input))),
    suspendBusiness: adminCredentialWebProcedure.input(adminBusinessEmergencyInput).mutation(({ ctx, input }) => callDomain(() => adminService.openBusinessEmergencyCase(ctx.user!.id, input))),
    restoreBusiness: adminCredentialWebProcedure.input(businessEmergencyRestoreInput).mutation(({ ctx, input }) => callDomain(() => adminService.restoreBusinessEmergency(ctx.user!.id, input.applicationId))),
    openRemittanceReview: adminCredentialWebProcedure.input(adminRemittanceCaseInput).mutation(({ ctx, input }) => callDomain(() => adminService.openRemittanceReviewCase(ctx.user!.id, input))),
    updateCase: adminCredentialWebProcedure.input(adminOperationalCaseUpdateInput).mutation(({ ctx, input }) => callDomain(() => adminService.updateAdminOperationalCase(ctx.user!.id, input))),
    assignCase: adminCredentialWebProcedure.input(adminCaseAssignmentInput).mutation(({ ctx, input }) => callDomain(() => adminService.assignAdminOperationalCase(ctx.user!.id, input))),
    acknowledgeSlaEscalation: adminCredentialWebProcedure.input(adminSlaEscalationAcknowledgeInput).mutation(({ ctx, input }) => callDomain(() => adminService.acknowledgeAdminSlaEscalation(ctx.user!.id, input.escalationId))),
    bulkModeratePhotoReports: adminCredentialWebProcedure.input(adminBulkPhotoModerationInput).mutation(({ ctx, input }) => callDomain(() => adminService.bulkModerateAdminPhotoReports(ctx.user!.id, input))),
    runAiTriage: adminCredentialWebProcedure.input(adminAiTriageInput).mutation(({ ctx, input }) => callDomain(() => adminService.runAdminAiTriage(ctx.user!.id, input))),
    reviewAiTriage: adminCredentialWebProcedure.input(adminAiTriageReviewInput).mutation(({ ctx, input }) => callDomain(() => adminService.reviewAdminAiTriage(ctx.user!.id, input))),
    submitAiTriageFeedback: adminCredentialWebProcedure.input(adminAiTriageFeedbackInput).mutation(({ ctx, input }) => callDomain(() => adminService.submitAdminAiTriageFeedback(ctx.user!.id, input))),
    aiTriageQualityMetrics: adminCredentialWebProcedure.query(({ ctx }) => callDomain(() => adminService.getAdminAiTriageQualityMetrics(ctx.user!.id))),
  }),
  adminFinance: router({
    decideRefund: adminCredentialWebProcedure.input(adminRefundDecisionInput).mutation(({ ctx, input }) => callDomain(() => adminService.decideRefundRequest(ctx.user!.id, input))),
  }),
  adminCredential: router({
    configuration: publicProcedure.query(() => adminCredentials.getAdminCredentialBootstrapConfiguration()),
    status: publicProcedure.query(({ ctx }) => callAdminSecurity(() => adminCredentials.getAdminCredentialStatus(ctx.req))),
    signIn: publicProcedure.input(adminCredentialSignInInput).mutation(({ ctx, input }) => callAdminSecurity(() => adminCredentials.signInAdminCredential(ctx.req, ctx.res, input))),
    provision: adminCredentialWebProcedure.input(adminCredentialProvisionInput).mutation(({ ctx, input }) => callAdminSecurity(() => adminCredentials.provisionAdminCredential(ctx.user!.id, input))),
  }),
  adminSecurity: router({
    webConfiguration: publicProcedure.query(() => getAdminWebConfiguration()),
    status: adminCredentialProcedure.query(({ ctx }) => callAdminSecurity(() => adminSecurity.getAdminSecurityStatus(ctx.user!.id, ctx.req))),
    beginMfaEnrollment: adminCredentialProcedure.mutation(({ ctx }) => callAdminSecurity(() => adminSecurity.beginAdminMfaEnrollment(ctx.user!.id, ctx.req))),
    confirmMfaEnrollment: adminCredentialProcedure.input(adminMfaCodeInput).mutation(async ({ ctx, input }) => { const result = await callAdminSecurity(() => adminSecurity.confirmAdminMfaEnrollment(ctx.user!.id, ctx.req, input.code)); adminSecurity.setAdminMfaCookie(ctx.res, ctx.req, result.token, result.expiresAt); return { recoveryCodes: result.recoveryCodes, expiresAt: result.expiresAt }; }),
    verifyMfaChallenge: adminCredentialProcedure.input(adminMfaCodeInput).mutation(async ({ ctx, input }) => { const result = await callAdminSecurity(() => adminSecurity.verifyAdminMfaChallenge(ctx.user!.id, ctx.req, input.code)); adminSecurity.setAdminMfaCookie(ctx.res, ctx.req, result.token, result.expiresAt); return { expiresAt: result.expiresAt }; }),
    allowlist: adminCredentialWebProcedure.query(({ ctx }) => callAdminSecurity(() => adminSecurity.listAdminIpAllowlist(ctx.user!.id))),
    createAllowlistRule: adminCredentialWebProcedure.input(adminIpAllowlistCreateInput).mutation(({ ctx, input }) => callAdminSecurity(() => adminSecurity.createAdminIpAllowlistRule(ctx.user!.id, input))),
    updateAllowlistRule: adminCredentialWebProcedure.input(adminIpAllowlistStatusInput).mutation(({ ctx, input }) => callAdminSecurity(() => adminSecurity.updateAdminIpAllowlistRule(ctx.user!.id, input))),
    sessionAudit: adminCredentialWebProcedure.input(adminSessionAuditFilterInput.optional()).query(({ ctx, input }) => callAdminSecurity(() => adminSecurity.getAdminSessionAudit(ctx.user!.id, input))),
    revokeSession: adminCredentialWebProcedure.input(adminWebSessionRevokeInput).mutation(({ ctx, input }) => callAdminSecurity(() => adminSecurity.revokeAdminWebSession(ctx.user!.id, input.sessionId))),
  }),

});

export type AppRouter = typeof appRouter;
