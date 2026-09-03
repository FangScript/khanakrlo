import "./load-env.js";
import { getDb } from "../server/db";
import {
  users,
  accountProfiles,
  workspaceApplications,
  workspaceMemberships,
  businessOrganisations,
  businessCommissionPolicies,
  businessOutlets,
  serviceZones,
  businessHours,
  menuCategories,
  menuItems,
  menuModifiers,
  riderAvailability,
  riderCashAccounts,
} from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

async function seed() {
  console.log("Connecting to database...");
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection failed. Ensure DATABASE_URL is set in .env");
  }

  console.log("Seeding Dummy Riders...");

  const dummyRiders = [
    {
      openId: "rider_tariq_01",
      name: "Tariq Mahmood",
      email: "tariq.rider@khanakarlo.pk",
      phone: "+923001112233",
      city: "Lahore",
    },
    {
      openId: "rider_bilal_02",
      name: "Bilal Ahmed",
      email: "bilal.rider@khanakarlo.pk",
      phone: "+923014445566",
      city: "Lahore",
    },
    {
      openId: "rider_usman_03",
      name: "Usman Ali",
      email: "usman.rider@khanakarlo.pk",
      phone: "+923027778899",
      city: "Lahore",
    },
    {
      openId: "rider_hamza_04",
      name: "Hamza Khan",
      email: "hamza.rider@khanakarlo.pk",
      phone: "+923035556677",
      city: "Lahore",
    },
  ];

  for (const riderData of dummyRiders) {
    // 1. User
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.openId, riderData.openId))
      .limit(1);

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          openId: riderData.openId,
          name: riderData.name,
          email: riderData.email,
          loginMethod: "phone",
          role: "user",
        })
        .returning();
      console.log(`  Created rider user: ${riderData.name} (id: ${user.id})`);
    } else {
      console.log(`  Rider user already exists: ${riderData.name} (id: ${user.id})`);
    }

    // 2. Account Profile
    const [existingProfile] = await db
      .select()
      .from(accountProfiles)
      .where(eq(accountProfiles.userId, user.id))
      .limit(1);

    if (!existingProfile) {
      await db.insert(accountProfiles).values({
        userId: user.id,
        givenName: riderData.name,
        phoneE164: riderData.phone,
        phoneVerifiedAt: new Date(),
        defaultCity: riderData.city,
      });
    }

    // 3. Workspace Application
    const [existingApp] = await db
      .select()
      .from(workspaceApplications)
      .where(
        and(
          eq(workspaceApplications.userId, user.id),
          eq(workspaceApplications.workspaceType, "rider")
        )
      )
      .limit(1);

    let applicationId = existingApp?.id;
    if (!existingApp) {
      const [newApp] = await db
        .insert(workspaceApplications)
        .values({
          userId: user.id,
          workspaceType: "rider",
          status: "approved",
          displayName: riderData.name,
          phoneE164: riderData.phone,
          city: riderData.city,
          submittedAt: new Date(),
          reviewedAt: new Date(),
        })
        .returning();
      applicationId = newApp.id;
    }

    // 4. Workspace Membership
    const [existingMembership] = await db
      .select()
      .from(workspaceMemberships)
      .where(
        and(
          eq(workspaceMemberships.userId, user.id),
          eq(workspaceMemberships.workspaceType, "rider")
        )
      )
      .limit(1);

    if (!existingMembership) {
      await db.insert(workspaceMemberships).values({
        userId: user.id,
        workspaceType: "rider",
        status: "active",
        applicationId,
        approvedAt: new Date(),
      });
    }

    // 5. Rider Availability
    const [existingAvail] = await db
      .select()
      .from(riderAvailability)
      .where(eq(riderAvailability.riderUserId, user.id))
      .limit(1);

    if (!existingAvail) {
      await db.insert(riderAvailability).values({
        riderUserId: user.id,
        status: "online",
      });
    } else {
      await db
        .update(riderAvailability)
        .set({ status: "online", updatedAt: new Date() })
        .where(eq(riderAvailability.riderUserId, user.id));
    }

    // 6. Rider Cash Account
    const [existingCash] = await db
      .select()
      .from(riderCashAccounts)
      .where(eq(riderCashAccounts.riderUserId, user.id))
      .limit(1);

    if (!existingCash) {
      await db.insert(riderCashAccounts).values({
        riderUserId: user.id,
        balanceMinor: 0,
        status: "active",
      });
    }
  }

  console.log("\nSeeding Dummy Restaurants & Menus...");

  const dummyRestaurants = [
    {
      ownerOpenId: "business_owner_lahori_dera",
      ownerName: "Lahori Dera Management",
      ownerEmail: "management@lahoridera.pk",
      legalName: "Lahori Dera Foodworks Private Limited",
      displayName: "Lahori Dera",
      supportPhone: "+923009876541",
      city: "Lahore",
      cuisine: "Pakistani · Karahi",
      description: "Authentic slow-cooked karahi, clay handis, and aromatic charcoal platters.",
      addressLine1: "Plot 14-C, MM Alam Road, Gulberg III",
      prepTimeMinutes: 25,
      deliveryFeeMinor: 8900,
      minimumOrderMinor: 30000,
      categories: [
        {
          name: "Karahi & Handi",
          sortOrder: 1,
          items: [
            {
              name: "Chicken Karahi (Full)",
              description: "Rich tomato-forward desi chicken karahi with ginger slices and green chillies.",
              priceMinor: 114000, // Rs. 1,140
              prepTimeMinutes: 25,
              modifiers: [
                { name: "Mild Spice", priceMinor: 0, isRequired: true },
                { name: "Regular Spice", priceMinor: 0, isRequired: false },
                { name: "Extra Spicy", priceMinor: 0, isRequired: false },
                { name: "Add Roghni Naan", priceMinor: 9000, isRequired: false },
                { name: "Add Mint Raita", priceMinor: 11000, isRequired: false },
              ],
            },
            {
              name: "Chicken Makhni Handi",
              description: "Boneless chicken cubes simmered in butter and roasted garam masala.",
              priceMinor: 108000, // Rs. 1,080
              prepTimeMinutes: 20,
              modifiers: [
                { name: "Regular Spice", priceMinor: 0, isRequired: false },
                { name: "Extra Creamy Finish", priceMinor: 5000, isRequired: false },
              ],
            },
            {
              name: "Mutton Shinwari Karahi",
              description: "Tender lamb cuts cooked exclusively with black pepper, green chillies, and tomatoes.",
              priceMinor: 245000, // Rs. 2,450
              prepTimeMinutes: 35,
              modifiers: [
                { name: "Extra Green Chillies", priceMinor: 0, isRequired: false },
                { name: "Double Butter Tarka", priceMinor: 12000, isRequired: false },
              ],
            },
          ],
        },
        {
          name: "Charcoal Grill & BBQ",
          sortOrder: 2,
          items: [
            {
              name: "Chicken Malai Boti (8 Pcs)",
              description: "Charcoal grilled boneless thigh cubes marinated in clotted cream and mild herbs.",
              priceMinor: 82000, // Rs. 820
              prepTimeMinutes: 20,
              modifiers: [
                { name: "Imli Chutney", priceMinor: 4000, isRequired: false },
                { name: "Garlic Mayo Dip", priceMinor: 6000, isRequired: false },
              ],
            },
            {
              name: "Beef Seekh Kebab (4 Pcs)",
              description: "Minced beef skewers seasoned with roasted cumin, coriander, and fresh mint.",
              priceMinor: 75000, // Rs. 750
              prepTimeMinutes: 18,
              modifiers: [
                { name: "Add Paratha", priceMinor: 8000, isRequired: false },
              ],
            },
          ],
        },
        {
          name: "Tandoor & Drinks",
          sortOrder: 3,
          items: [
            {
              name: "Tandoori Roghni Naan",
              description: "Fluffy sesame seed topped naan brushed with fresh desi ghee.",
              priceMinor: 9000, // Rs. 90
              prepTimeMinutes: 10,
              modifiers: [],
            },
            {
              name: "Fresh Mint Lassi (500ml)",
              description: "Chilled whipped yogurt drink with crushed mint and black salt.",
              priceMinor: 22000, // Rs. 220
              prepTimeMinutes: 5,
              modifiers: [
                { name: "Sweet", priceMinor: 0, isRequired: false },
                { name: "Salted", priceMinor: 0, isRequired: false },
              ],
            },
          ],
        },
      ],
    },
    {
      ownerOpenId: "business_owner_biryani_house",
      ownerName: "Biryani House Management",
      ownerEmail: "orders@biryanihouse.pk",
      legalName: "Karachi Biryani House Lahore Ltd",
      displayName: "Biryani House",
      supportPhone: "+923009876542",
      city: "Lahore",
      cuisine: "Pakistani · Biryani",
      description: "Authentic Karachi style saffron basmati biryani with spiced potatoes and tender meats.",
      addressLine1: "Shop 7, Main Boulevard, DHA Phase 5",
      prepTimeMinutes: 18,
      deliveryFeeMinor: 6900,
      minimumOrderMinor: 25000,
      categories: [
        {
          name: "Signature Biryani",
          sortOrder: 1,
          items: [
            {
              name: "Classic Chicken Biryani (Single)",
              description: "Long-grain fragrant basmati rice, tender chicken, spiced aloo, and house raita.",
              priceMinor: 52000, // Rs. 520
              prepTimeMinutes: 15,
              modifiers: [
                { name: "Double Aloo", priceMinor: 5000, isRequired: false },
                { name: "Boiled Egg", priceMinor: 6000, isRequired: false },
                { name: "Extra Masala", priceMinor: 0, isRequired: false },
              ],
            },
            {
              name: "Special Biryani Box with Kebab",
              description: "Full portion chicken biryani served with a seekh kebab, fresh kachumber, and raita.",
              priceMinor: 69000, // Rs. 690
              prepTimeMinutes: 15,
              modifiers: [
                { name: "Chilled Soft Drink 345ml", priceMinor: 14000, isRequired: false },
              ],
            },
            {
              name: "Beef Nalli Biryani",
              description: "Slow braised beef shank marrow biryani with caramelized onions and saffron aromatics.",
              priceMinor: 95000, // Rs. 950
              prepTimeMinutes: 20,
              modifiers: [
                { name: "Extra Bone Marrow Portion", priceMinor: 25000, isRequired: false },
              ],
            },
          ],
        },
        {
          name: "Sides & Refreshers",
          sortOrder: 2,
          items: [
            {
              name: "Chicken Shami Kebab (2 Pcs)",
              description: "Hand-pounded chicken and lentil patties fried in egg batter.",
              priceMinor: 18000, // Rs. 180
              prepTimeMinutes: 10,
              modifiers: [],
            },
            {
              name: "Fresh Kachumber Salad",
              description: "Diced cucumbers, tomatoes, and red onions in a lemon juice dressing.",
              priceMinor: 9000, // Rs. 90
              prepTimeMinutes: 5,
              modifiers: [],
            },
            {
              name: "Zeera Raita",
              description: "Whipped spiced yogurt with roasted cumin.",
              priceMinor: 7000, // Rs. 70
              prepTimeMinutes: 5,
              modifiers: [],
            },
          ],
        },
      ],
    },
    {
      ownerOpenId: "business_owner_smash_town",
      ownerName: "Smash Town Burgers",
      ownerEmail: "hello@smashtown.pk",
      legalName: "Smash Town Enterprises",
      displayName: "Smash Town",
      supportPhone: "+923009876543",
      city: "Lahore",
      cuisine: "Fast Food · Burgers",
      description: "Crispy fried chicken fillets, smashed beef patties, house-made sauces, and seasoned fries.",
      addressLine1: "Civic Centre, Block D2, Johar Town",
      prepTimeMinutes: 20,
      deliveryFeeMinor: 9900,
      minimumOrderMinor: 35000,
      categories: [
        {
          name: "Burgers & Wraps",
          sortOrder: 1,
          items: [
            {
              name: "Loaded Crispy Chicken Burger",
              description: "Golden fried chicken breast, dill pickles, ice-berg lettuce, and smoky pepper sauce.",
              priceMinor: 76000, // Rs. 760
              prepTimeMinutes: 18,
              modifiers: [
                { name: "Double Melted Cheese", priceMinor: 15000, isRequired: false },
                { name: "Jalapeno Kick", priceMinor: 8000, isRequired: false },
                { name: "Make it a Combo (Fries + Drink)", priceMinor: 28000, isRequired: false },
              ],
            },
            {
              name: "Double Beef Smash Burger",
              description: "Two seared beef patties, American cheese slice, caramelized onions, and secret smash sauce in brioche.",
              priceMinor: 89000, // Rs. 890
              prepTimeMinutes: 20,
              modifiers: [
                { name: "Extra Beef Patty", priceMinor: 32000, isRequired: false },
                { name: "Beef Bacon Strip", priceMinor: 18000, isRequired: false },
              ],
            },
            {
              name: "Smoky Grilled Chicken Wrap",
              description: "Charcoal grilled strips, crunchy purple slaw, and chipotle mayo in a grilled tortilla.",
              priceMinor: 64000, // Rs. 640
              prepTimeMinutes: 15,
              modifiers: [
                { name: "Spicy Mayo Drizzle", priceMinor: 5000, isRequired: false },
              ],
            },
          ],
        },
        {
          name: "Loaded Fries & Shakes",
          sortOrder: 2,
          items: [
            {
              name: "Animal Style Loaded Fries",
              description: "Skin-on crispy fries smothered in cheese sauce, minced chicken, and crispy onions.",
              priceMinor: 48000, // Rs. 480
              prepTimeMinutes: 12,
              modifiers: [],
            },
            {
              name: "Masala Crinkle Fries",
              description: "Crispy salted crinkle fries dusted with house spice blend.",
              priceMinor: 22000, // Rs. 220
              prepTimeMinutes: 10,
              modifiers: [],
            },
            {
              name: "Belgian Chocolate Milkshake",
              description: "Heavy cream chocolate shake blended with premium cocoa and chocolate shavings.",
              priceMinor: 45000, // Rs. 450
              prepTimeMinutes: 8,
              modifiers: [],
            },
          ],
        },
      ],
    },
  ];

  for (const restaurant of dummyRestaurants) {
    // 1. Owner User
    let [owner] = await db
      .select()
      .from(users)
      .where(eq(users.openId, restaurant.ownerOpenId))
      .limit(1);

    if (!owner) {
      [owner] = await db
        .insert(users)
        .values({
          openId: restaurant.ownerOpenId,
          name: restaurant.ownerName,
          email: restaurant.ownerEmail,
          loginMethod: "phone",
          role: "user",
        })
        .returning();
      console.log(`  Created business owner: ${restaurant.ownerName} (id: ${owner.id})`);
    }

    // 2. Workspace Application
    let [app] = await db
      .select()
      .from(workspaceApplications)
      .where(
        and(
          eq(workspaceApplications.userId, owner.id),
          eq(workspaceApplications.workspaceType, "business")
        )
      )
      .limit(1);

    if (!app) {
      [app] = await db
        .insert(workspaceApplications)
        .values({
          userId: owner.id,
          workspaceType: "business",
          businessType: "restaurant",
          status: "approved",
          displayName: restaurant.displayName,
          phoneE164: restaurant.supportPhone,
          city: restaurant.city,
          submittedAt: new Date(),
          reviewedAt: new Date(),
        })
        .returning();
    }

    // 3. Workspace Membership
    let [membership] = await db
      .select()
      .from(workspaceMemberships)
      .where(
        and(
          eq(workspaceMemberships.userId, owner.id),
          eq(workspaceMemberships.workspaceType, "business")
        )
      )
      .limit(1);

    if (!membership) {
      [membership] = await db
        .insert(workspaceMemberships)
        .values({
          userId: owner.id,
          workspaceType: "business",
          status: "active",
          applicationId: app.id,
          approvedAt: new Date(),
        })
        .returning();
    }

    // 4. Business Organisation
    let [org] = await db
      .select()
      .from(businessOrganisations)
      .where(eq(businessOrganisations.applicationId, app.id))
      .limit(1);

    if (!org) {
      [org] = await db
        .insert(businessOrganisations)
        .values({
          applicationId: app.id,
          ownerUserId: owner.id,
          businessType: "restaurant",
          legalName: restaurant.legalName,
          displayName: restaurant.displayName,
          supportPhone: restaurant.supportPhone,
          city: restaurant.city,
          status: "live",
        })
        .returning();
      console.log(`  Created organisation: ${restaurant.displayName} (id: ${org.id})`);
    } else {
      await db
        .update(businessOrganisations)
        .set({ status: "live", displayName: restaurant.displayName })
        .where(eq(businessOrganisations.id, org.id));
      console.log(`  Organisation updated to live: ${restaurant.displayName} (id: ${org.id})`);
    }

    // 5. Commission Policy
    const [existingPolicy] = await db
      .select()
      .from(businessCommissionPolicies)
      .where(eq(businessCommissionPolicies.organisationId, org.id))
      .limit(1);

    if (!existingPolicy) {
      await db.insert(businessCommissionPolicies).values({
        organisationId: org.id,
        commissionRateBps: 1200, // 12.00%
        revenueBase: "item_subtotal_after_discount",
        taxTreatment: "pilot_standard",
        settlementCadence: "weekly_cycle",
      });
    }

    // 6. Outlet
    let [outlet] = await db
      .select()
      .from(businessOutlets)
      .where(eq(businessOutlets.organisationId, org.id))
      .limit(1);

    if (!outlet) {
      [outlet] = await db
        .insert(businessOutlets)
        .values({
          organisationId: org.id,
          name: `${restaurant.displayName} Main Outlet`,
          cuisine: restaurant.cuisine,
          description: restaurant.description,
          addressLine1: restaurant.addressLine1,
          city: restaurant.city,
          latitudeE6: 31520400,
          longitudeE6: 74358700,
          prepTimeMinutes: restaurant.prepTimeMinutes,
          acceptsDelivery: true,
          isPaused: false,
          status: "approved",
        })
        .returning();
    } else {
      await db
        .update(businessOutlets)
        .set({ isPaused: false, status: "approved" })
        .where(eq(businessOutlets.id, outlet.id));
    }

    // 7. Service Zone
    const [existingZone] = await db
      .select()
      .from(serviceZones)
      .where(eq(serviceZones.organisationId, org.id))
      .limit(1);

    if (!existingZone) {
      await db.insert(serviceZones).values({
        organisationId: org.id,
        outletId: outlet.id,
        name: `${restaurant.city} Core Zone`,
        city: restaurant.city,
        centerLatitudeE6: 31520400,
        centerLongitudeE6: 74358700,
        radiusMeters: 15000,
        courierBaseMinutes: 8,
        courierMinutesPerKm: 3,
        deliveryFeeMinor: restaurant.deliveryFeeMinor,
        minimumOrderMinor: restaurant.minimumOrderMinor,
        isActive: true,
      });
    }

    // 8. Business Operating Hours (all 7 days, open 24/7 or full day)
    for (let weekday = 0; weekday <= 6; weekday++) {
      const [existingHour] = await db
        .select()
        .from(businessHours)
        .where(
          and(
            eq(businessHours.scopeType, "outlet"),
            eq(businessHours.scopeId, outlet.id),
            eq(businessHours.weekday, weekday)
          )
        )
        .limit(1);

      if (!existingHour) {
        await db.insert(businessHours).values({
          scopeType: "outlet",
          scopeId: outlet.id,
          weekday,
          opensAt: "00:00",
          closesAt: "23:59",
          isClosed: false,
        });
      } else {
        await db
          .update(businessHours)
          .set({ opensAt: "00:00", closesAt: "23:59", isClosed: false })
          .where(eq(businessHours.id, existingHour.id));
      }
    }

    // 9. Categories and Items
    for (const catData of restaurant.categories) {
      let [category] = await db
        .select()
        .from(menuCategories)
        .where(
          and(
            eq(menuCategories.outletId, outlet.id),
            eq(menuCategories.name, catData.name)
          )
        )
        .limit(1);

      if (!category) {
        [category] = await db
          .insert(menuCategories)
          .values({
            outletId: outlet.id,
            name: catData.name,
            sortOrder: catData.sortOrder,
            isActive: true,
          })
          .returning();
      }

      for (const itemData of catData.items) {
        let [item] = await db
          .select()
          .from(menuItems)
          .where(
            and(
              eq(menuItems.categoryId, category.id),
              eq(menuItems.name, itemData.name)
            )
          )
          .limit(1);

        if (!item) {
          [item] = await db
            .insert(menuItems)
            .values({
              categoryId: category.id,
              name: itemData.name,
              description: itemData.description,
              priceMinor: itemData.priceMinor,
              prepTimeMinutes: itemData.prepTimeMinutes,
              isAvailable: true,
            })
            .returning();
        }

        for (const modData of itemData.modifiers) {
          const [existingMod] = await db
            .select()
            .from(menuModifiers)
            .where(
              and(
                eq(menuModifiers.menuItemId, item.id),
                eq(menuModifiers.name, modData.name)
              )
            )
            .limit(1);

          if (!existingMod) {
            await db.insert(menuModifiers).values({
              menuItemId: item.id,
              name: modData.name,
              priceMinor: modData.priceMinor,
              isRequired: modData.isRequired,
              isAvailable: true,
            });
          }
        }
      }
    }
  }

  console.log("\nDummy seeding finished successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed with error:", err);
  process.exit(1);
});
