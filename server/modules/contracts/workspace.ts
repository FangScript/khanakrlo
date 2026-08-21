import { z } from "zod";

import { BUSINESS_TYPES, WORKSPACE_APPLICATION_TYPES, WORKSPACE_APPLICATION_STATUSES } from "../../../shared/workspace";

export const workspaceApplicationInput = z.object({
  workspaceType: z.enum(WORKSPACE_APPLICATION_TYPES),
  businessType: z.enum(BUSINESS_TYPES).optional(),
  displayName: z.string().trim().max(160).optional(),
  phoneE164: z.string().regex(/^\+[1-9]\d{7,14}$/).optional(),
  city: z.string().trim().max(120).optional(),
});

export const workspaceApplicationSaveInput = workspaceApplicationInput.extend({
  submit: z.boolean().default(false),
});

export const workspaceApplicationReviewInput = z.object({
  applicationId: z.number().int().positive(),
  status: z.enum(["changes_required", "approved", "suspended"] satisfies [
    (typeof WORKSPACE_APPLICATION_STATUSES)[number],
    ...(typeof WORKSPACE_APPLICATION_STATUSES)[number][],
  ]),
  reviewNote: z.string().trim().max(1000).optional(),
});

export type WorkspaceApplicationSaveInput = z.infer<typeof workspaceApplicationSaveInput>;
export type WorkspaceApplicationReviewInput = z.infer<typeof workspaceApplicationReviewInput>;
