import { describe, expect, it } from "vitest";
import { inviteSchema } from "./household";

describe("inviteSchema", () => {
  it("accepts a valid email", () => {
    expect(inviteSchema.safeParse({ email: "partner@example.com" }).success).toBe(
      true
    );
  });

  it("lowercases and trims the email", () => {
    const result = inviteSchema.safeParse({ email: "  Partner@Example.com  " });
    expect(result.success && result.data.email).toBe("partner@example.com");
  });

  it("rejects an invalid email", () => {
    expect(inviteSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });
});
