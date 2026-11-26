import { describe, expect, it } from "vitest";
import { REPORT_COMMENT_MAX_LENGTH } from "@/shared/accounts-family/book-report";
import { firstErrorCode, reportBookSchema } from "./schema";

// UC-PAR-report-book 3a, the comment limit and 6 (unconfirmed). Invented values only.
const base = {
  childId: "child-1",
  bookId: "book-1",
  reason: "too-difficult",
  confirmed: true,
};

function codeOf(input: unknown) {
  const result = reportBookSchema.safeParse(input);
  return result.success ? "ok" : firstErrorCode(result.error);
}

describe("reportBookSchema (UC-PAR-report-book)", () => {
  it("accepts a reason with no comment", () => {
    expect(reportBookSchema.parse(base)).toEqual({
      ...base,
      comment: undefined,
    });
  });

  it("3a: a missing or empty reason is REASON_REQUIRED", () => {
    expect(codeOf({ ...base, reason: undefined })).toBe("REASON_REQUIRED");
    expect(codeOf({ ...base, reason: "" })).toBe("REASON_REQUIRED");
  });

  it("3a: a reason off the list is INVALID_REASON", () => {
    expect(codeOf({ ...base, reason: "my-own-reason" })).toBe("INVALID_REASON");
  });

  it("comment: the limit is accepted and one more character is COMMENT_TOO_LONG", () => {
    const atLimit = "a".repeat(REPORT_COMMENT_MAX_LENGTH);
    expect(codeOf({ ...base, comment: atLimit })).toBe("ok");
    expect(codeOf({ ...base, comment: `${atLimit}a` })).toBe(
      "COMMENT_TOO_LONG",
    );
  });

  it("comment: the limit counts characters, not UTF-16 units, as the validator does", () => {
    // 250 emoji are 500 UTF-16 units; the schema is the one limit (review of #136).
    const emoji = "📚".repeat(REPORT_COMMENT_MAX_LENGTH);
    expect(codeOf({ ...base, comment: emoji })).toBe("ok");
    expect(codeOf({ ...base, comment: `${emoji}📚` })).toBe("COMMENT_TOO_LONG");
  });

  it("comment: trimmed once, and a blank comment is no comment", () => {
    expect(
      reportBookSchema.parse({ ...base, comment: "  Too scary  " }).comment,
    ).toBe("Too scary");
    expect(
      reportBookSchema.parse({ ...base, comment: "   " }).comment,
    ).toBeUndefined();
    const padded = ` ${"a".repeat(REPORT_COMMENT_MAX_LENGTH)} `;
    expect(codeOf({ ...base, comment: padded })).toBe("ok");
  });

  it("6: confirmed missing, false or a truthy non-boolean is NOT_CONFIRMED", () => {
    expect(codeOf({ ...base, confirmed: undefined })).toBe("NOT_CONFIRMED");
    expect(codeOf({ ...base, confirmed: false })).toBe("NOT_CONFIRMED");
    expect(codeOf({ ...base, confirmed: "true" })).toBe("NOT_CONFIRMED");
  });

  it("a missing child or book ID gets the code an unknown one gets", () => {
    expect(codeOf({ ...base, childId: undefined })).toBe("CHILD_NOT_FOUND");
    expect(codeOf({ ...base, bookId: 42 })).toBe("BOOK_NOT_FOUND");
  });

  it("anything that is not an object is INVALID_INPUT", () => {
    expect(codeOf("report")).toBe("INVALID_INPUT");
  });
});
