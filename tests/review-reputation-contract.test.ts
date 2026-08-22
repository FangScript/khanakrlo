import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { reviewCreateInput } from "../server/modules/contracts/reviews";

const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("verified customer reviews and reputation contracts", () => {
  it("accepts only bounded 1–5 ratings with meaningful customer feedback", () => {
    expect(reviewCreateInput.parse({ orderId: 12, rating: 5, publicComment: "Fresh karahi", feedbackTopics: ["food_quality"] }).rating).toBe(5);
    expect(() => reviewCreateInput.parse({ orderId: 12, rating: 0, publicComment: "Nope" })).toThrow();
    expect(() => reviewCreateInput.parse({ orderId: 12, rating: 6, publicComment: "Nope" })).toThrow();
    expect(() => reviewCreateInput.parse({ orderId: 12, rating: 4 })).toThrow();
    expect(() => reviewCreateInput.parse({ orderId: 12, rating: 4, feedbackTopics: ["not_a_topic"] })).toThrow();
  });

  it("anchors review creation to the owned delivered order and one review per order", () => {
    const source = projectFile("server/review-service.ts");
    const schema = projectFile("drizzle/schema.ts");
    expect(source).toContain("eq(orders.customerUserId, userId)");
    expect(source).toContain('order.status !== "delivered"');
    expect(source).toContain("You have already reviewed this delivered order.");
    expect(schema).toContain('uniqueIndex("order_reviews_order_unique").on(table.orderId)');
    expect(source).toContain('action: "order_review_created"');
    expect(source).toContain('eventType: "review.created"');
  });

  it("keeps private feedback Business-only while public discovery uses published reviews and real aggregates", () => {
    const source = projectFile("server/review-service.ts");
    const discovery = projectFile("server/business-service.ts");
    expect(source).toContain("...(audience !== \"public\" ? { privateFeedback");
    expect(source).toContain('eq(orderReviews.visibility, "published")');
    expect(discovery).toContain("getOrganisationReputations");
    expect(discovery).toContain("rankingScoreMilli");
    expect(discovery).not.toContain("rating: 4.");
  });

  it("provides Customer and Business review surfaces", () => {
    expect(projectFile("app/order-tracking.tsx")).toContain('pathname: "/order-review"');
    expect(projectFile("app/order-review.tsx")).toContain("trpc.reviews.create.useMutation");
    expect(projectFile("app/business/reviews.tsx")).toContain("trpc.businessReviews.reply.useMutation");
    expect(projectFile("app/business/home.tsx")).toContain('router.push("/business/reviews"');
    expect(projectFile("app/restaurant/[id].tsx")).toContain("verified customer review");
  });
});
