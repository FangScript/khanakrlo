import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { enforceAdminWebAccess, AdminWebSecurityError } from "../admin-security";
import { getAdminCredentialUser } from "../admin-credentials";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

export const adminWebProcedure = adminProcedure.use(
  t.middleware(async (opts) => {
    try {
      await enforceAdminWebAccess(opts.ctx.user!.id, opts.ctx.req);
    } catch (error) {
      const message = error instanceof AdminWebSecurityError ? error.message : "Admin web security validation failed.";
      throw new TRPCError({ code: "FORBIDDEN", message });
    }
    return opts.next();
  }),
);

const requireAdminCredential = t.middleware(async (opts) => {
  const user = await getAdminCredentialUser(opts.ctx.req);
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin username and password sign-in is required." });
  return opts.next({ ctx: { ...opts.ctx, user } });
});

export const adminCredentialProcedure = t.procedure.use(requireAdminCredential);
export const adminCredentialWebProcedure = adminCredentialProcedure.use(
  t.middleware(async (opts) => {
    try { await enforceAdminWebAccess(opts.ctx.user!.id, opts.ctx.req); }
    catch (error) { throw new TRPCError({ code: "FORBIDDEN", message: error instanceof AdminWebSecurityError ? error.message : "Admin web security validation failed." }); }
    return opts.next();
  }),
);
