import { describe, it, expect } from "vitest";
import {
  ORDER_OWNER_MAX_ENTRIES,
  ORDER_OWNER_TTL_SECONDS,
  addOwnedOrder,
  isOrderOwner,
  parseOwnedOrders,
} from "@/lib/orders/ownership";

const SECRET = "test-secret";
const NOW = 1_800_000_000;
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const uuid = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;

describe("order-owner cookie (L1)", () => {
  it("round-trips a freshly added order", () => {
    const raw = addOwnedOrder(undefined, A, NOW, SECRET);
    expect(parseOwnedOrders(raw, NOW, SECRET).map((e) => e.id)).toEqual([A]);
  });

  it("keeps newest first and dedupes", () => {
    let raw = addOwnedOrder(undefined, A, NOW, SECRET);
    raw = addOwnedOrder(raw, B, NOW + 10, SECRET);
    raw = addOwnedOrder(raw, A, NOW + 20, SECRET);
    expect(parseOwnedOrders(raw, NOW + 20, SECRET).map((e) => e.id)).toEqual([A, B]);
  });

  it("caps the number of remembered orders", () => {
    let raw = "";
    for (let i = 0; i < ORDER_OWNER_MAX_ENTRIES + 5; i++) {
      raw = addOwnedOrder(raw, uuid(i), NOW + i, SECRET);
    }
    const ids = parseOwnedOrders(raw, NOW + 20, SECRET).map((e) => e.id);
    expect(ids).toHaveLength(ORDER_OWNER_MAX_ENTRIES);
    expect(ids[0]).toBe(uuid(ORDER_OWNER_MAX_ENTRIES + 4));
  });

  it("drops entries older than 7 days", () => {
    const raw = addOwnedOrder(undefined, A, NOW, SECRET);
    expect(parseOwnedOrders(raw, NOW + ORDER_OWNER_TTL_SECONDS, SECRET)).toHaveLength(1);
    expect(parseOwnedOrders(raw, NOW + ORDER_OWNER_TTL_SECONDS + 1, SECRET)).toHaveLength(0);
  });

  it("rejects a hand-written (unsigned or forged) entry", () => {
    expect(parseOwnedOrders(A, NOW, SECRET)).toEqual([]);
    expect(parseOwnedOrders(`${A}~${NOW}`, NOW, SECRET)).toEqual([]);
    expect(parseOwnedOrders(`${A}~${NOW}~AAAAAAAAAAAAAAAAAAAAAA`, NOW, SECRET)).toEqual([]);
  });

  it("rejects an entry signed with another secret", () => {
    const raw = addOwnedOrder(undefined, A, NOW, "other-secret");
    expect(parseOwnedOrders(raw, NOW, SECRET)).toEqual([]);
  });

  it("rejects a valid signature moved onto a different order id", () => {
    const raw = addOwnedOrder(undefined, A, NOW, SECRET);
    expect(parseOwnedOrders(raw.replace(A, B), NOW, SECRET)).toEqual([]);
  });

  it("rejects a tampered timestamp", () => {
    const raw = addOwnedOrder(undefined, A, NOW, SECRET);
    expect(parseOwnedOrders(raw.replace(`~${NOW}~`, `~${NOW + 5}~`), NOW + 5, SECRET)).toEqual([]);
  });

  it("ignores garbage and keeps valid neighbours", () => {
    const raw = addOwnedOrder(undefined, A, NOW, SECRET);
    expect(parseOwnedOrders(`junk.${raw}.~~.`, NOW, SECRET).map((e) => e.id)).toEqual([A]);
  });

  it("returns nothing without a secret or cookie", () => {
    const raw = addOwnedOrder(undefined, A, NOW, SECRET);
    expect(parseOwnedOrders(raw, NOW, "")).toEqual([]);
    expect(parseOwnedOrders(undefined, NOW, SECRET)).toEqual([]);
    expect(parseOwnedOrders("", NOW, SECRET)).toEqual([]);
  });
});

describe("isOrderOwner (L1)", () => {
  const USER = "user-1";

  it("owner via cookie (guest order)", () => {
    expect(
      isOrderOwner({ orderId: A, orderUserId: null, ownedOrderIds: [A], viewerUserId: null }),
    ).toBe(true);
  });

  it("cookie match is case-insensitive", () => {
    expect(
      isOrderOwner({
        orderId: A.toUpperCase(),
        orderUserId: null,
        ownedOrderIds: [A],
        viewerUserId: null,
      }),
    ).toBe(true);
  });

  it("owner via signed-in account", () => {
    expect(
      isOrderOwner({ orderId: A, orderUserId: USER, ownedOrderIds: [], viewerUserId: USER }),
    ).toBe(true);
  });

  it("different signed-in user is not the owner", () => {
    expect(
      isOrderOwner({ orderId: A, orderUserId: USER, ownedOrderIds: [B], viewerUserId: "user-2" }),
    ).toBe(false);
  });

  it("anonymous viewer of a guest order without the cookie is not the owner", () => {
    expect(
      isOrderOwner({ orderId: A, orderUserId: null, ownedOrderIds: [B], viewerUserId: null }),
    ).toBe(false);
  });

  it("a signed-in viewer never matches a guest order by null user id", () => {
    expect(
      isOrderOwner({ orderId: A, orderUserId: null, ownedOrderIds: [], viewerUserId: USER }),
    ).toBe(false);
  });
});
