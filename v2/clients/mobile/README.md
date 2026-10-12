# Shared React Native mobile app

This is the active v2 mobile client: one React Native + Expo + TypeScript project, with customer, restaurant and rider workspaces for both Android and iOS. There are no separate customer/rider/merchant installs. The preceding Kotlin and Swift directories are inactive reference work, not parallel release targets.

## Run

For the local browser sandbox, set `EXPO_PUBLIC_SANDBOX=1` and run `pnpm --filter @khana/mobile sandbox`, then open `http://localhost:8087`. It uses in-memory sample sessions, phone consent and cash balance; it sends no requests to the microservices. Sample changes reset when the page reloads. The sandbox is enabled only in a web development build. Restaurant operations are still a placeholder. Native Google sign-in, real payments and background tracking are not simulated as completed workflows.

From `v2`, install workspace dependencies. Copy this client's `.env.example` to `.env`, configure the gateway address and Google OAuth IDs, then run `pnpm --filter @khana/mobile dev`. Android emulators use `10.0.2.2`; iOS simulators use `localhost`; real devices need a reachable development host or HTTPS staging endpoint.

Google sign-in uses the native Google Sign-In package and requires an Expo development/native build, not Expo Go. Use `pnpm --filter @khana/mobile android` with an Android SDK/JDK, or `pnpm --filter @khana/mobile ios` on a Mac with Xcode. Configure Android signing-certificate fingerprints and package name in Google OAuth. iOS also needs its client ID and reversed Google URL scheme in `GOOGLE_IOS_URL_SCHEME`. Public client IDs are safe build configuration; never put backend signing keys, database URLs, service tokens or encryption keys in Expo public variables.

The iOS configuration and shared screens are present. That is not a signed or tested iOS release. Android remains the first pilot release unless the team changes the rollout; iOS can follow from this same source rather than a Swift rewrite.

## Structure and performance

- `src/core`: shared transport, secure refresh-token storage, one refresh operation across concurrent callers, design components and authorized workspace definitions.
- `src/features/customer`, `merchant`, `rider`: independently owned UI modules. Only the selected workspace mounts. Lazy module loading is not a claim that production Metro bundles are split into downloads.
- `src/generated/customer.ts`: generated from the Customer OpenAPI contract; regenerate with `pnpm clients:generate`, checked by CI.
- TanStack Query manages bounded cache lifetimes, account-specific keys, cancellation and app focus. Logout clears cached account data. Mutations have no automatic retries; retryable writes must keep their original idempotency key.
- Access tokens remain in memory; only refresh tokens go to SecureStore. Client routing is convenience; authorization is checked by each microservice.

Current connected screens: Google sign-in/session restore, workspace selection, Customer phone consent/profile, rider cash balance. Restaurant workflows, checkout/KDS/dispatch/chat, full profile/address UI, localization and device acceptance remain unfinished.

`pnpm --filter @khana/mobile check`, `test`, and `export` validate types, session behavior and JavaScript bundles. Native Android/iOS builds, Google OAuth, SecureStore, notifications, background location, camera/privacy behavior and performance need separate device testing. No background tracking permission is requested before that feature exists.

Official references: [React Native](https://reactnative.dev/docs/getting-started), [Expo Google authentication](https://docs.expo.dev/guides/google-authentication/), [Google sign-in Expo setup](https://react-native-google-signin.github.io/docs/setting-up/expo).
