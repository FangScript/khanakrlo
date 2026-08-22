import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { businessOnboardingService } from "./modules/business-onboarding/service";
import { catalogueService } from "./modules/catalogue/service";
import { businessDocumentUploadInput, businessDraftInput, businessEmergencyRestoreInput, businessEmergencySuspensionInput, businessHoursUpdateInput, businessLiveStatusInput, catalogueCategoryArchiveInput, catalogueCategoryCreateInput, catalogueCategoryUpdateInput, catalogueItemArchiveInput, catalogueItemCreateInput, catalogueItemImageUploadInput, catalogueItemUpdateInput, catalogueModifierArchiveInput, catalogueModifierCreateInput, catalogueModifierUpdateInput, deliveryZoneUpdateInput, discoveryFilterInput, liveBusinessMenuInput } from "./modules/contracts/business";
import { workspaceApplicationReviewInput, workspaceApplicationSaveInput } from "./modules/contracts/workspace";
import { discoveryService } from "./modules/discovery/service";
import { callDomain } from "./modules/gateway/domain-error";
import { identityWorkspaceService } from "./modules/identity-workspace/service";
import { orderService } from "./modules/orders/service";
import { codCollectionConfirmInput, orderByIdInput, orderPlaceInput, orderQuoteInput, orderTransitionInput, riderAssignmentInput, riderLocationUpdateInput, riderOrderTransitionInput } from "./modules/contracts/orders";
import { addressService } from "./modules/addresses/service";
import { customerAddressCreateInput, customerAddressIdInput, customerAddressUpdateInput } from "./modules/contracts/addresses";
import { reviewBusinessInput, reviewCreateInput, reviewModerationInput, reviewOrderInput, reviewPhotoRemoveInput, reviewPhotoReportInput, reviewPhotoUploadInput, reviewPhotoPrivacyUpdateInput, reviewReplyInput } from "./modules/contracts/reviews";
import { reviewService } from "./modules/reviews/service";

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
    availableRiders: protectedProcedure.query(({ ctx }) => callDomain(() => orderService.availableRiders(ctx.user.id))),
    assignRider: protectedProcedure.input(riderAssignmentInput).mutation(({ ctx, input }) => callDomain(() => orderService.assignRider(ctx.user.id, input))),
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

  adminBusiness: router({
    listBusinesses: protectedProcedure.query(({ ctx }) => { if (ctx.user.role !== "admin") throw new Error("Administrator access is required."); return callDomain(() => businessOnboardingService.listApplications()); }),
    suspend: protectedProcedure.input(businessEmergencySuspensionInput).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "admin") throw new Error("Administrator access is required."); await callDomain(() => businessOnboardingService.suspendBusiness(ctx.user.id, input.applicationId, input.reason)); return { success: true } as const; }),
    restore: protectedProcedure.input(businessEmergencyRestoreInput).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "admin") throw new Error("Administrator access is required."); await callDomain(() => businessOnboardingService.restoreBusiness(ctx.user.id, input.applicationId)); return { success: true } as const; }),
  }),
  adminReviews: router({
    moderate: protectedProcedure.input(reviewModerationInput).mutation(({ ctx, input }) => { if (ctx.user.role !== "admin") throw new Error("Administrator access is required."); return callDomain(() => reviewService.moderate(ctx.user.id, input.reviewId, input.visibility, input.note)); }),
  }),

});

export type AppRouter = typeof appRouter;
