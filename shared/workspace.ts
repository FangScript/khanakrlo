export const WORKSPACE_TYPES = ["customer", "business", "rider"] as const;
export const WORKSPACE_APPLICATION_TYPES = ["business", "rider"] as const;
export const WORKSPACE_APPLICATION_STATUSES = ["draft", "submitted", "changes_required", "approved", "suspended"] as const;
export const WORKSPACE_MEMBERSHIP_STATUSES = ["active", "suspended"] as const;
export const BUSINESS_TYPES = ["restaurant", "cloud_kitchen"] as const;

export type WorkspaceType = (typeof WORKSPACE_TYPES)[number];
export type WorkspaceApplicationType = (typeof WORKSPACE_APPLICATION_TYPES)[number];
export type WorkspaceApplicationStatus = (typeof WORKSPACE_APPLICATION_STATUSES)[number];
export type WorkspaceMembershipStatus = (typeof WORKSPACE_MEMBERSHIP_STATUSES)[number];
export type BusinessType = (typeof BUSINESS_TYPES)[number];
export type WorkspaceAvailabilityStatus = WorkspaceApplicationStatus | WorkspaceMembershipStatus | "not_started";

export type WorkspaceApplicationInput = {
  workspaceType: WorkspaceApplicationType;
  businessType?: BusinessType;
  displayName?: string;
  phoneE164?: string;
  city?: string;
};

export function validateWorkspaceApplication(input: WorkspaceApplicationInput): string[] {
  const errors: string[] = [];
  if (!input.displayName?.trim()) errors.push("A display name is required.");
  if (!input.phoneE164?.match(/^\+[1-9]\d{7,14}$/)) errors.push("A verified phone number in international format is required.");
  if (!input.city?.trim()) errors.push("A city is required.");
  if (input.workspaceType === "business" && !input.businessType) errors.push("Choose Restaurant or Cloud Kitchen.");
  if (input.workspaceType === "rider" && input.businessType) errors.push("Rider applications cannot contain a business type.");
  return errors;
}

export function canEditWorkspaceApplication(status: WorkspaceApplicationStatus) {
  return status === "draft" || status === "changes_required";
}

export function canReviewWorkspaceApplication(current: WorkspaceApplicationStatus, next: Extract<WorkspaceApplicationStatus, "changes_required" | "approved" | "suspended">) {
  if (current !== "submitted") return false;
  return next === "changes_required" || next === "approved" || next === "suspended";
}

export function resolveWorkspaceAvailability(membershipStatus: WorkspaceMembershipStatus | undefined, applicationStatus: WorkspaceApplicationStatus | undefined): WorkspaceAvailabilityStatus {
  if (membershipStatus === "active") return "active";
  if (membershipStatus === "suspended") return "suspended";
  return applicationStatus ?? "not_started";
}

export function canEnterWorkspace(workspaceType: WorkspaceType, status: WorkspaceAvailabilityStatus) {
  return workspaceType === "customer" ? status === "active" : status === "active";
}
