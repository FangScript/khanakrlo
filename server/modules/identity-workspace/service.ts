import * as legacyDb from "../../db";
import { validateWorkspaceApplication } from "../../../shared/workspace";
import type { WorkspaceApplicationSaveInput, WorkspaceApplicationReviewInput } from "../contracts/workspace";

/**
 * Identity & Workspace boundary. The implementation currently delegates to the
 * shared database adapter while callers depend only on this domain interface.
 */
export const identityWorkspaceService = {
  getWorkspaceSummaries: (userId: number) => legacyDb.getWorkspaceSummaries(userId),
  saveApplication: (userId: number, input: WorkspaceApplicationSaveInput) => {
    const { submit, ...application } = input;
    if (submit) {
      const errors = validateWorkspaceApplication(application);
      if (errors.length > 0) throw new Error(errors.join(" "));
    }
    return legacyDb.saveWorkspaceApplication(userId, application, submit);
  },
  reviewApplication: (reviewerUserId: number, input: WorkspaceApplicationReviewInput) => legacyDb.reviewWorkspaceApplication(reviewerUserId, input.applicationId, input.status, input.reviewNote),
};
