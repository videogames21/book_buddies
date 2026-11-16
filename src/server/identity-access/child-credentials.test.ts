import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomInt } from "node:crypto";
import { generateChildPassword } from "./child-credentials";
import { PASSWORD_WORDS } from "./password-words";
import { hashPassword, verifyPassword } from "./passwords";

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return { ...actual, randomInt: vi.fn(actual.randomInt) };
});

describe(
  "generateChildPassword (UC-PAR-create-kid-account main, password)",
  { timeout: 20_000 },
  () => {
    beforeEach(() => {
      vi.mocked(randomInt).mockClear();
    });
    it("uses cryptographic randomness for each word and the suffix", () => {
      generateChildPassword();
      expect(vi.mocked(randomInt).mock.calls).toEqual([
        [PASSWORD_WORDS.length],
        [PASSWORD_WORDS.length],
        [PASSWORD_WORDS.length],
        [100],
      ]);
    });
    it("is three listed words and two digits, joined by hyphens", () => {
      for (let i = 0; i < 50; i++) {
        const parts = generateChildPassword().split("-");
        expect(parts).toHaveLength(4);
        for (const word of parts.slice(0, 3))
          expect(PASSWORD_WORDS).toContain(word);
        expect(parts[3]).toMatch(/^\d{2}$/);
      }
    });

    it("differs between calls", () => {
      const passwords = new Set(
        Array.from({ length: 50 }, () => generateChildPassword()),
      );
      expect(passwords.size).toBe(50);
    });

    it("verifies against the hash that would be stored", async () => {
      const password = generateChildPassword();
      expect(await verifyPassword(password, await hashPassword(password))).toBe(
        true,
      );
    });

    it("draws from a list with no duplicates", () => {
      expect(new Set(PASSWORD_WORDS).size).toBe(PASSWORD_WORDS.length);
    });
  },
);
