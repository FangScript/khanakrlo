import { relations } from "drizzle-orm";

import { accountProfiles, auditEvents, users, workspaceApplications, workspaceMemberships } from "./schema";

export const usersRelations = relations(users, ({ many, one }) => ({
  profile: one(accountProfiles, {
    fields: [users.id],
    references: [accountProfiles.userId],
  }),
  memberships: many(workspaceMemberships),
  applications: many(workspaceApplications, { relationName: "applicationOwner" }),
  reviewedApplications: many(workspaceApplications, { relationName: "applicationReviewer" }),
  auditEvents: many(auditEvents),
}));

export const accountProfilesRelations = relations(accountProfiles, ({ one }) => ({
  user: one(users, {
    fields: [accountProfiles.userId],
    references: [users.id],
  }),
}));

export const workspaceMembershipsRelations = relations(workspaceMemberships, ({ one }) => ({
  user: one(users, {
    fields: [workspaceMemberships.userId],
    references: [users.id],
  }),
  application: one(workspaceApplications, {
    fields: [workspaceMemberships.applicationId],
    references: [workspaceApplications.id],
  }),
}));

export const workspaceApplicationsRelations = relations(workspaceApplications, ({ one }) => ({
  owner: one(users, {
    fields: [workspaceApplications.userId],
    references: [users.id],
    relationName: "applicationOwner",
  }),
  reviewer: one(users, {
    fields: [workspaceApplications.reviewedByUserId],
    references: [users.id],
    relationName: "applicationReviewer",
  }),
}));

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  actor: one(users, {
    fields: [auditEvents.actorUserId],
    references: [users.id],
  }),
}));

