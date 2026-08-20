# Khana KarLo — Mobile Interface Design Plan

## Product direction

Khana KarLo is a **Pakistan-first food ordering experience** for diners in Rawalpindi and Islamabad. The customer MVP is deliberately focused on helping a diner move from an address to a confident order with minimal friction: browse nearby places, choose food, make edits, review the total, and follow the order to delivery. The experience uses the supplied identity as a reference: deep delivery green, fast orange accents, warm cream surfaces, and a friendly, energetic food-service voice.

All screens assume a **9:16 portrait viewport** and one-handed use. Important actions live in the bottom half of the screen or as a persistent bottom control. Navigation follows familiar iOS patterns: a clear tab bar, native-style large headings where useful, 44-point-plus touch targets, a visible back affordance on drill-in screens, and restrained shadows and motion.

## Brand system

| Token | Color | Intended use |
| --- | --- | --- |
| Delivery Green | `#064B2C` | Primary brand surface, active navigation, headings, confirmation states |
| Garden Green | `#168A4A` | Supporting positive state, location chips, fresh accents |
| Chilli Orange | `#FF6B00` | Main calls to action, offer badges, quantity controls |
| Saffron | `#FFB73D` | Supporting highlights and promotional gradient |
| Cream | `#FFF8ED` | Warm app canvas and loading background |
| Ink | `#17251D` | High-contrast body copy |
| Mist | `#F2F3EF` | Card dividers and inactive controls |

## Screen list

| Screen | Primary content | Core actions |
| --- | --- | --- |
| Home / Discovery | Greeting, delivery address, search, offer card, cuisine shortcuts, restaurant list | Search, choose category, open a restaurant, manage delivery address |
| Restaurant Detail | Restaurant hero, ETA, ratings, cuisine details, category chips, menu item list | Browse menu, add a dish, open dish customization |
| Dish Customization Sheet | Dish image, description, spice selection, optional add-ons, item total | Adjust choices, add to cart |
| Cart | Order line items, quantity steppers, delivery details, promo field, cost breakdown | Edit order, apply code, begin checkout |
| Checkout | Address summary, payment choices, delivery note, payable total | Select COD or wallet, place order |
| Order Tracking | Live status timeline, expected arrival, restaurant and rider details | Review current status, contact support (display-only for MVP) |
| Search | Search entry, recent/explored suggestions, matching restaurants and dishes | Find and open a result |
| Orders | Active order summary and prior order list | Reopen tracking, review past order details |
| Profile | User identity placeholder, saved addresses, help and notification options | Review account-related information |

## Main user flows

### Discover and order

1. A diner opens **Home** and sees the delivery area and restaurant suggestions.
2. They select a cuisine shortcut or a restaurant card.
3. They browse the restaurant’s menu and tap **Add** on a dish.
4. If required, a bottom sheet captures spice and add-on choices, then adds the configured dish to the cart.
5. The persistent cart bar reveals the current item count and running total.
6. The diner reviews quantity, promotion, delivery address, and fees in **Cart**.
7. They confirm cash-on-delivery or a wallet option in **Checkout**, then tap **Place order**.
8. The app presents **Order Tracking** with an understandable preparation-to-delivery timeline.

### Search for a dish

1. The diner taps the Home search field.
2. The search screen presents matching restaurants and dishes as the diner types.
3. Tapping a restaurant returns them to its menu; tapping a dish opens that restaurant with the dish ready to configure.

### Review delivery status

1. The diner selects **Orders** in the tab bar.
2. The active order appears first with an ETA and current status.
3. Selecting it opens tracking, where the progress state moves from confirmed through preparing and rider pickup to delivery.

## Interaction and visual rules

The app avoids dense dashboards. Restaurant cards use large rounded imagery, clear food names, a rating, price cue, and ETA. Promotions use a dark-green field with one bright orange action, while ordering surfaces remain mostly cream or white to preserve readability. Food photography is treated as a supporting visual layer; it never obscures prices, restaurant names, or primary controls.

The core visual anchor on Home is the delivery address and search field. The core conversion anchor on menus is the orange **Add** control. The cart uses a green bottom bar to give the shopper a stable, low-effort route to checkout. Destructive choices require a simple native confirmation rather than being hidden behind gestures.

## MVP data vocabulary

| Entity | Essential fields |
| --- | --- |
| Restaurant | `id`, `name`, `cuisine`, `rating`, `reviewCount`, `deliveryFee`, `eta`, `isOpen`, `image`, `offer` |
| MenuCategory | `id`, `name`, `items` |
| MenuItem | `id`, `restaurantId`, `name`, `description`, `price`, `image`, `isPopular`, `customizationOptions` |
| CartLine | `id`, `menuItemId`, `name`, `quantity`, `unitPrice`, `selectedOptions` |
| DeliveryAddress | `label`, `addressLine`, `area`, `instructions` |
| Order | `id`, `status`, `restaurantName`, `items`, `total`, `eta`, `paymentMethod`, `timeline` |

## Scope boundary

This iteration builds a **local, interactive customer-app MVP** using deterministic sample restaurant and menu data. It does not yet create production user accounts, payment-gateway connections, rider GPS, push notifications, restaurant operations, or the secondary WhatsApp order channel. The interface, navigation, data model, and order state are structured so those capabilities can be connected in a later backend-focused phase.
