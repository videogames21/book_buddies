import { describe, expect, it } from "vitest";
import { firstErrorOf, signUpSchema } from "./schema";

const valid = {
  name: "Invented Parent",
  email: "invented.parent@example.test",
  password: "correct horse",
  acknowledged: true,
};

function codeOf(input: Record<string, unknown>) {
  const parsed = signUpSchema.safeParse(input);
  return parsed.success ? null : firstErrorOf(parsed.error);
}

describe("UC-PAR-onboarding sign-up schema (design/par-field-values.md)", () => {
  it("accepts a valid sign-up", () => {
    expect(codeOf(valid)).toBeNull();
  });

  it.each([undefined, false, "true", 1, "on"])(
    "3b: refuses an acknowledgment of %s with CONSENT_NOT_ACKNOWLEDGED",
    (acknowledged) => {
      expect(codeOf({ ...valid, acknowledged })).toBe(
        "CONSENT_NOT_ACKNOWLEDGED",
      );
    },
  );

  it.each(["", "not-an-email", "a@b", "two@@example.test", "x y@example.test"])(
    "4b: refuses the email %j with INVALID_EMAIL",
    (email) => {
      expect(codeOf({ ...valid, email })).toBe("INVALID_EMAIL");
    },
  );

  it("4b: refuses an email over 254 characters", () => {
    const email = `${"a".repeat(64)}@${"b".repeat(186)}.test`;
    expect(email.length).toBe(256);
    expect(codeOf({ ...valid, email })).toBe("INVALID_EMAIL");
  });

  it("4b: trims and lowercases the email once", () => {
    const parsed = signUpSchema.parse({
      ...valid,
      email: "  Invented.Parent@Example.TEST ",
    });
    expect(parsed.email).toBe("invented.parent@example.test");
  });

  it("4c: refuses 7 and 129 characters, accepts 8 and 128 with no class rules", () => {
    expect(codeOf({ ...valid, password: "a".repeat(7) })).toBe("WEAK_PASSWORD");
    expect(codeOf({ ...valid, password: "a".repeat(129) })).toBe(
      "WEAK_PASSWORD",
    );
    expect(codeOf({ ...valid, password: "a".repeat(8) })).toBeNull();
    expect(codeOf({ ...valid, password: "a".repeat(128) })).toBeNull();
  });

  it("4c: refuses a password equal to the email, ignoring case", () => {
    expect(codeOf({ ...valid, password: "INVENTED.PARENT@EXAMPLE.TEST" })).toBe(
      "WEAK_PASSWORD",
    );
  });

  it("name: refuses empty or blank with NAME_REQUIRED, over 100 with INVALID_NAME", () => {
    expect(codeOf({ ...valid, name: "" })).toBe("NAME_REQUIRED");
    expect(codeOf({ ...valid, name: "   " })).toBe("NAME_REQUIRED");
    expect(codeOf({ ...valid, name: "a".repeat(101) })).toBe("INVALID_NAME");
    expect(codeOf({ ...valid, name: ` ${"a".repeat(100)} ` })).toBeNull();
  });

  it("returns the first failing field in form order", () => {
    expect(
      codeOf({ name: "", email: "bad", password: "x", acknowledged: false }),
    ).toBe("NAME_REQUIRED");
    expect(codeOf({ ...valid, email: "bad", acknowledged: false })).toBe(
      "INVALID_EMAIL",
    );
  });
});
