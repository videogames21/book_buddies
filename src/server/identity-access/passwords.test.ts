import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./passwords";

// scrypt at OWASP cost is slow when the integration suite runs alongside.
describe("password hashing", { timeout: 20_000 }, () => {
  it("verifies the password it hashed and rejects another", async () => {
    const stored = await hashPassword("otter-maple-sun-42");
    expect(await verifyPassword("otter-maple-sun-42", stored)).toBe(true);
    expect(await verifyPassword("otter-maple-sun-43", stored)).toBe(false);
  });

  it("salts each hash and never contains the plaintext", async () => {
    const first = await hashPassword("otter-maple-sun-42");
    const second = await hashPassword("otter-maple-sun-42");
    expect(first).not.toBe(second);
    expect(first).not.toContain("otter");
  });

  it("rejects a stored value that is not a scrypt hash", async () => {
    expect(await verifyPassword("anything", "plain-text")).toBe(false);
  });
});
