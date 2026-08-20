import { COOKIE_NAME } from "../shared/const.js";
import { BUSINESS_TYPES, WORKSPACE_APPLICATION_TYPES, WORKSPACE_APPLICATION_STATUSES, validateWorkspaceApplication } from "../shared/workspace";
import { BUSINESS_DOCUMENT_TYPES, type BusinessApplicationDraft } from "../shared/business";
import * as db from "./db";
import * as business from "./business-service";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

const workspaceApplicationInput = z.object({
  workspaceType: z.enum(WORKSPACE_APPLICATION_TYPES),
  businessType: z.enum(BUSINESS_TYPES).optional(),
  displayName: z.string().trim().max(160).optional(),
  phoneE164: z.string().regex(/^\+[1-9]\d{7,14}$/).optional(),
  city: z.string().trim().max(120).optional(),
});

const businessDraftInput = z.object({
  legalName: z.string().max(180), displayName: z.string().max(160), supportPhone: z.string().max(20), city: z.string().max(120), addressLine1: z.string().max(255), description: z.string().max(2000).optional(), pickupInstructions: z.string().max(500).optional(), prepTimeMinutes: z.number().int(), openingTime: z.string().max(5), closingTime: z.string().max(5), serviceZone: z.object({ name: z.string().max(120), deliveryFeeMinor: z.number().int(), minimumOrderMinor: z.number().int() }), menu: z.array(z.object({ category: z.string().max(120), items: z.array(z.object({ name: z.string().max(160), description: z.string().max(1000).optional(), priceMinor: z.number().int(), prepTimeMinutes: z.number().int() })) })), businessType: z.enum(BUSINESS_TYPES), restaurant: z.object({ cuisine: z.string().max(120) }).optional(), cloudKitchen: z.object({ kitchenName: z.string().max(160), capacityLimit: z.number().int(), brands: z.array(z.object({ name: z.string().max(160), cuisine: z.string().max(120), description: z.string().max(1000).optional() })), stations: z.array(z.object({ name: z.string().max(120), capacity: z.number().int() })) }).optional(),
});

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
    mine: protectedProcedure.query(({ ctx }) => db.getWorkspaceSummaries(ctx.user.id)),
    saveApplication: protectedProcedure
      .input(workspaceApplicationInput.extend({ submit: z.boolean().default(false) }))
      .mutation(async ({ ctx, input }) => {
        const { submit, ...application } = input;
        if (submit) {
          const errors = validateWorkspaceApplication(application);
          if (errors.length > 0) throw new Error(errors.join(" "));
        }
        const applicationId = await db.saveWorkspaceApplication(ctx.user.id, application, submit);
        return { applicationId };
      }),
    reviewApplication: protectedProcedure
      .input(z.object({ applicationId: z.number().int().positive(), status: z.enum(["changes_required", "approved", "suspended"]), reviewNote: z.string().trim().max(1000).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new Error("Administrator access is required.");
        await db.reviewWorkspaceApplication(ctx.user.id, input.applicationId, input.status, input.reviewNote);
        return { success: true } as const;
      }),
  }),

  businessApplication: router({
    mine: protectedProcedure.query(({ ctx }) => business.getMyBusinessApplication(ctx.user.id)),
    saveDraft: protectedProcedure.input(businessDraftInput).mutation(({ ctx, input }) => business.saveBusinessDraft(ctx.user.id, input as BusinessApplicationDraft, false)),
    submit: protectedProcedure.input(businessDraftInput).mutation(({ ctx, input }) => business.saveBusinessDraft(ctx.user.id, input as BusinessApplicationDraft, true)),
    uploadDocument: protectedProcedure.input(z.object({ documentType: z.enum(BUSINESS_DOCUMENT_TYPES), originalName: z.string().min(1).max(255), mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]), dataBase64: z.string().min(1).max(7_000_000) })).mutation(({ ctx, input }) => business.uploadBusinessDocument(ctx.user.id, input)),
  }),

  businessOperations: router({
    mine: protectedProcedure.query(({ ctx }) => business.getMyBusinessOperations(ctx.user.id)),
  }),

  adminBusiness: router({
    listApplications: protectedProcedure.query(({ ctx }) => { if (ctx.user.role !== "admin") throw new Error("Administrator access is required."); return business.listBusinessApplications(); }),
    reviewApplication: protectedProcedure.input(z.object({ applicationId: z.number().int().positive(), status: z.enum(["changes_required", "approved", "suspended"]), reviewNote: z.string().trim().max(1000).optional() })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "admin") throw new Error("Administrator access is required."); await business.reviewBusinessApplication(ctx.user.id, input.applicationId, input.status, input.reviewNote); return { success: true } as const; }),
  }),

});

export type AppRouter = typeof appRouter;
