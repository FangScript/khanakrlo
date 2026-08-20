# Khana KarLo Product Research Notes

## Merchant and cloud-kitchen operations

The merchant application must be treated as an operational workspace rather than a simplified customer app. Uber Eats’ published Order Manager flow combines incoming and scheduled-order handling, preparation and ready-for-pickup status changes, real-time delivery monitoring, and live maintenance of item availability, pricing, menus, and operating hours.[1]

For Khana KarLo, this supports a distinct restaurant/cloud-kitchen application with a high-priority **live order queue**, a dedicated **order detail and preparation workflow**, and separate management areas for **menu availability**, **business hours**, **store status**, and **delivery/rider visibility**. Cloud kitchens require the same shared core, with an additional operating-context switch for multiple brands or outlets.

## References

[1]: https://merchants.ubereats.com/us/en/technology/manage-orders/uber-eats-orders-app/ "Manage Operations with the Uber Eats Orders App"

## Rider operations

The rider application needs an explicitly operational home rather than a static task list. Uber’s Driver app separates a map-centred Home with an online/offline control and safety access, Discover for local earning opportunities, Earnings, and Inbox. Its delivery flow then runs through offer review, pickup navigation, item verification, drop-off navigation, and a delivery-completion action that can include evidence such as a photo, signature, or identity verification.[2]

For Khana KarLo, the MVP rider app should therefore include **online/offline Home**, **assignment offer**, **active delivery**, **pickup verification**, **drop-off proof**, **earnings**, and **inbox/support**. Navigation should launch only after an accepted assignment; a rider should never need to hunt for a pickup or customer address from a generic list.

[2]: https://www.uber.com/us/en/deliver/driver-app/ "Get to know the Driver app"

## Customer order tracking

The customer needs a persistent order-history entry point and a dedicated tracking screen rather than an order-status toast. Uber’s help flow directs a customer from an Upcoming-orders list into Track, where they can interpret status, see the rider’s location on a map after assignment, and contact the rider by phone or message.[3]

For Khana KarLo, checkout must lead to an **active order card** in the Orders tab, with an **order timeline**, an ETA, **rider map/location once assigned**, and contextual **help/contact** actions. The customer flow should continue working even when live tracking is unavailable by showing the last reliable status and a support route.

[3]: https://help.uber.com/en/ubereats/restaurants/article/check-the-status-of-my-order-?nodeId=4148ea8b-c9d8-409d-b7bf-b2fcb019a498 "Check the status of my order"
