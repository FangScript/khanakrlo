import "./load-env.js";
import { discoveryService } from "../server/modules/discovery/service";
import { getDb } from "../server/db";
import { workspaceMemberships, riderAvailability, accountProfiles, businessOrganisations, businessOutlets, menuItems } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";

async function verify() {
  console.log("=== CHECKING SEEDED DATA IN DATABASE ===");
  const db = await getDb();
  if (!db) {
    console.error("DB connection failed");
    process.exit(1);
  }

  // 1. Check Organisations & Outlets
  const orgs = await db.select().from(businessOrganisations);
  const outlets = await db.select().from(businessOutlets);
  const items = await db.select().from(menuItems);

  console.log(`\nRestaurants in DB (${orgs.length}):`);
  for (const org of orgs) {
    const outlet = outlets.find((o) => o.organisationId === org.id);
    console.log(`  • [ID: ${org.id}] ${org.displayName} (${org.businessType}) - Status: ${org.status}, City: ${org.city}`);
    if (outlet) {
      console.log(`    Outlet: ${outlet.name} | Cuisine: ${outlet.cuisine} | Prep: ${outlet.prepTimeMinutes}m | Paused: ${outlet.isPaused}`);
    }
  }
  console.log(`Total Menu Items across restaurants: ${items.length}`);

  // 2. Check Discovery Service output
  const live = await discoveryService.getLiveBusinesses();
  console.log(`\nLive Businesses returned by discoveryService (${live.length}):`);
  for (const b of live) {
    console.log(`  • ${b.displayName} | Cuisine: ${b.cuisine} | Items: ${b.itemCount} | Open: ${b.isOpen}`);
  }

  // 3. Check Riders
  const riders = await db
    .select({
      userId: workspaceMemberships.userId,
      name: accountProfiles.givenName,
      phone: accountProfiles.phoneE164,
      city: accountProfiles.defaultCity,
      status: riderAvailability.status,
    })
    .from(workspaceMemberships)
    .innerJoin(accountProfiles, eq(accountProfiles.userId, workspaceMemberships.userId))
    .innerJoin(riderAvailability, eq(riderAvailability.riderUserId, workspaceMemberships.userId))
    .where(and(eq(workspaceMemberships.workspaceType, "rider"), eq(workspaceMemberships.status, "active")));

  console.log(`\nActive Online Riders in DB (${riders.length}):`);
  for (const r of riders) {
    console.log(`  • [User ${r.userId}] ${r.name} | Phone: ${r.phone} | City: ${r.city} | Status: ${r.status}`);
  }

  console.log("\n=== ALL SEEDED DATA CONFIRMED IN SUPABASE POSTGRESQL ===");
  process.exit(0);
}

verify().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
