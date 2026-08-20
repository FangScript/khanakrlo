import { COOKIE_NAME } from "../shared/const.js";
import { BUSINESS_TYPES, WORKSPACE_APPLICATION_TYPES, WORKSPACE_APPLICATION_STATUSES, validateWorkspaceApplication } from "../shared/workspace";
import * as db from "./db";
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

});

export type AppRouter = typeof appRouter;
