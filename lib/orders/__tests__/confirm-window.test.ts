import { describe, expect, it } from "vitest";
import {
  awaitingConfirmation,
  confirmDeadline,
  confirmationLate,
  formatDeadline,
  hoursLeft,
} from "../confirm-window";

const H = 60 * 60 * 1000;
const placed = "2026-12-01T00:15:00.000Z"; // Tue 02:15 Cairo (UTC+2, no DST in December)
const t0 = new Date(placed).getTime();
const cod = { status: "pending" as const, payment_method: "cod" as const, payment_status: "pending" as const, created_at: placed };

describe("awaitingConfirmation", () => {
  it("is true for a pending COD order", () => {
    expect(awaitingConfirmation(cod)).toBe(true);
  });

  it("is false once the order moved on or was cancelled", () => {
    expect(awaitingConfirmation({ ...cod, status: "confirmed" })).toBe(false);
    expect(awaitingConfirmation({ ...cod, status: "cancelled" })).toBe(false);
  });

  it("skips unpaid InstaPay (waiting on the customer), not paid InstaPay", () => {
    expect(awaitingConfirmation({ ...cod, payment_method: "instapay" })).toBe(false);
    expect(awaitingConfirmation({ ...cod, payment_method: "instapay", payment_status: "paid" })).toBe(true);
  });
});

describe("confirmDeadline / hoursLeft", () => {
  it("is 24 hours after the order, round the clock", () => {
    expect(confirmDeadline(placed).toISOString()).toBe("2026-12-02T00:15:00.000Z");
  });

  it("counts whole hours left", () => {
    expect(hoursLeft(placed, t0)).toBe(24);
    expect(hoursLeft(placed, t0 + 23.5 * H)).toBe(0);
    expect(hoursLeft(placed, t0 + 25 * H)).toBe(-1);
  });
});

describe("confirmationLate", () => {
  it("flags a still-pending order from hour 20", () => {
    expect(confirmationLate(cod, t0 + 19.9 * H)).toBe(false);
    expect(confirmationLate(cod, t0 + 20 * H)).toBe(true);
  });

  it("never flags confirmed or unpaid InstaPay orders", () => {
    expect(confirmationLate({ ...cod, status: "confirmed" }, t0 + 30 * H)).toBe(false);
    expect(confirmationLate({ ...cod, payment_method: "instapay" }, t0 + 30 * H)).toBe(false);
  });
});

describe("formatDeadline", () => {
  it("shows Cairo time", () => {
    const en = formatDeadline(confirmDeadline(placed), "en");
    expect(en).toMatch(/Wednesday/);
    expect(en).toMatch(/2 December/);
    expect(en).toMatch(/2:15/);
  });
});
