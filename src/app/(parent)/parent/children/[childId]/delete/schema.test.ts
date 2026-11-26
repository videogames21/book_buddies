import { describe, expect, it } from "vitest";
import { deleteChildSchema, firstErrorCode, nicknameMatches } from "./schema";

// UC-PAR-delete-kid-account step 3 and 4a. Invented nicknames only.

const CHILD_ID = "6b0f2c6e-0f3c-4b5e-9d51-0c2d5e1a7a11";

describe("nicknameMatches (4a, nickname)", () => {
  it("accepts the exact nickname, and ignores spaces at either end", () => {
    expect(nicknameMatches("Starfish", "Starfish")).toBe(true);
    expect(nicknameMatches("  Starfish\t", "Starfish")).toBe(true);
  });

  it.each([
    ["starfish", "letter case"],
    ["STARFISH", "letter case"],
    ["Starfisx", "one letter"],
    ["Starfis", "a missing letter"],
    ["Star fish", "a space inside"],
    ["", "nothing typed"],
  ])("refuses %j (%s)", (typed) => {
    expect(nicknameMatches(typed, "Starfish")).toBe(false);
  });
});

describe("deleteChildSchema", () => {
  const valid = { childId: CHILD_ID, password: "pw", nickname: "Starfish" };

  it("accepts a child ID from the route, a password and a nickname", () => {
    expect(deleteChildSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    [{ ...valid, password: "" }, "PASSWORD_REQUIRED"],
    [{ ...valid, password: undefined }, "PASSWORD_REQUIRED"],
    [{ ...valid, nickname: "   " }, "NICKNAME_REQUIRED"],
    [{ ...valid, nickname: undefined }, "NICKNAME_REQUIRED"],
    [{ ...valid, childId: "not-a-child-id" }, "INVALID_INPUT"],
    [{ ...valid, password: "x".repeat(1025) }, "INVALID_INPUT"],
  ])("refuses %j with its code", (input, code) => {
    const parsed = deleteChildSchema.safeParse(input);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(firstErrorCode(parsed.error)).toBe(code);
  });
});
