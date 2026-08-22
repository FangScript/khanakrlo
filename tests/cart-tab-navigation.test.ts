import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("dedicated Customer Cart tab", () => {
  it("registers Cart between Home and Orders with an accessible bag icon and a persisted quantity badge", () => {
    const tabs = readFileSync(resolve(process.cwd(), "app/(tabs)/_layout.tsx"), "utf8");
    const icons = readFileSync(resolve(process.cwd(), "components/ui/icon-symbol.tsx"), "utf8");
    expect(tabs).toContain('name="cart"');
    expect(tabs.indexOf('name="cart"')).toBeGreaterThan(tabs.indexOf('name="index"'));
    expect(tabs.indexOf('name="cart"')).toBeLessThan(tabs.indexOf('name="orders"'));
    expect(tabs).toContain("cartQuantity");
    expect(icons).toContain('"bag.fill": "shopping-bag"');
  });

  it("uses a single Cart route backed by the shared persisted-cart component and checkout handoff", () => {
    const tab = readFileSync(resolve(process.cwd(), "app/(tabs)/cart.tsx"), "utf8");
    const cart = readFileSync(resolve(process.cwd(), "components/customer-cart-screen.tsx"), "utf8");
    expect(existsSync(resolve(process.cwd(), "app/cart.tsx"))).toBe(false);
    expect(tab).toContain("CustomerCartScreen");
    expect(cart).toContain("useKhanaStore");
    expect(cart).toContain('router.push("/checkout"');
    expect(cart).toContain("tabMode");
  });
});
