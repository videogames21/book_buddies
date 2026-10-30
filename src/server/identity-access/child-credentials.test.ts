import { describe, expect, it } from "vitest";
import { generateChildPassword } from "./child-credentials";
import { PASSWORD_WORDS } from "./password-words";
import { hashPassword, verifyPassword } from "./passwords";

describe("generateChildPassword (UC-PAR-create-kid-account main, password)", { timeout: 20_000 }, () => {
  it("is three listed words and two digits, joined by hyphens", () => {
    for (let i = 0; i < 50; i++) {
      const parts = generateChildPassword().split("-");
      expect(parts).toHaveLength(4);
      for (const word of parts.slice(0, 3)) expect(PASSWORD_WORDS).toContain(word);
      expect(parts[3]).toMatch(/^\d{2}$/);
    }
  });

  it("differs between calls", () => {
    const passwords = new Set(Array.from({ length: 50 }, () => generateChildPassword()));
    expect(passwords.size).toBe(50);
  });

  it("verifies against the hash that would be stored", async () => {
    const password = generateChildPassword();
    expect(await verifyPassword(password, await hashPassword(password))).toBe(true);
  });

  it("draws from a list with no duplicates", () => {
    expect(new Set(PASSWORD_WORDS).size).toBe(PASSWORD_WORDS.length);
  });
});
