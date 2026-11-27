import type { ChildDataSnapshot } from "@/shared/accounts-family/child-data";
import { ObjectId } from "mongodb";
import { beforeEach, expect, it, vi } from "vitest";
import { insertChild } from "../../../../../../tests/fixtures/children";
import { insertConsentedMainParent } from "../../../../../../tests/fixtures/family";
import { insertBook } from "../../../../../../tests/fixtures/catalog";
import { insertRating } from "../../../../../../tests/fixtures/shelf";
import { resetDatabase } from "../../../../../../tests/integration/db";
import { insertParentNote } from "@/server/accounts-family/parent-notes";
import { insertChildIdentity } from "@/server/child-identity/child-identity";
import { hashPassword } from "@/server/identity-access/passwords";
import { requireParent } from "@/server/identity-access/sessions";
import { fail, ok } from "@/server/lib/action-result";
import { getDb, withTransaction } from "@/server/lib/db";
import { exportChildData, reviewChildData } from "./actions";

vi.mock("@/server/identity-access/sessions", () => ({
  requireParent: vi.fn(),
}));

const password = "invented parent password";
beforeEach(async () => {
  vi.clearAllMocks();
  await resetDatabase();
});

async function fixture() {
  const parent = await insertConsentedMainParent();
  const childId = await insertChild(parent.familyId, {
    nickname: "Reader one",
  });
  const hash = await hashPassword(password);
  await getDb()
    .collection("users")
    .updateOne(
      { _id: new ObjectId(parent.userId) },
      { $set: { passwordHash: hash } },
    );
  vi.mocked(requireParent).mockResolvedValue(
    ok({ ...parent, parentRole: "main" }),
  );
  await withTransaction((tx) =>
    insertChildIdentity(tx, { childId, age: 8, grade: "3" }),
  );
  return { parent, childId, hash };
}

it("requires the current parent's password and excludes other families before checking it", async () => {
  const { childId } = await fixture();
  const foreign = await insertConsentedMainParent();
  const foreignChild = await insertChild(foreign.familyId);
  await expect(
    reviewChildData({ childId: foreignChild, password }),
  ).resolves.toMatchObject({ error: { code: "CHILD_NOT_FOUND" } });
  await expect(
    reviewChildData({ childId, password: "incorrect" }),
  ).resolves.toMatchObject({ error: { code: "PASSWORD_INCORRECT" } });
  await expect(getDb().collection("auditLog").countDocuments()).resolves.toBe(
    0,
  );
  vi.mocked(requireParent).mockResolvedValue(
    fail("NOT_A_PARENT", "Not a parent."),
  );
  await expect(exportChildData({})).resolves.toMatchObject({
    error: { code: "NOT_A_PARENT" },
  });
});

it("reviews and exports only projected data with committed audits, even after consent is revoked", async () => {
  const { parent, childId, hash } = await fixture();
  const sibling = await insertChild(parent.familyId, {
    nickname: "Sibling sentinel",
  });
  const book = await insertBook("blocked");
  await insertRating(childId, book, "likedIt");
  await withTransaction((tx) =>
    insertParentNote(tx, sibling, "Sibling secret", "none"),
  );
  const db = getDb();
  await db
    .collection("consentRecords")
    .updateOne(
      { familyId: new ObjectId(parent.familyId) },
      { $set: { revokedAt: new Date() } },
    );
  await db.collection("users").insertOne({
    role: "child",
    childId,
    username: "invented-reader",
    passwordHash: "child-secret-hash",
  });

  const review = await reviewChildData({ childId, password });
  const exported = await exportChildData({ childId, password });
  if (!review.ok || !exported.ok)
    throw new Error("Expected review and export to succeed");
  const snapshot = JSON.parse(exported.data) as ChildDataSnapshot;
  expect(snapshot.categories).toHaveLength(12);
  expect(snapshot.categories).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        key: "ratings",
        records: [expect.objectContaining({ bookId: book, value: "likedIt" })],
      }),
      expect.objectContaining({
        key: "consent",
        records: [
          expect.objectContaining({ revokedAt: expect.any(String) as unknown }),
        ],
      }),
    ]),
  );
  expect((JSON.parse(review.data) as ChildDataSnapshot).categories).toEqual(
    snapshot.categories,
  );
  for (const excluded of [
    hash,
    password,
    "child-secret-hash",
    "Sibling sentinel",
    "Sibling secret",
    "confirmationTokenHash",
  ]) {
    expect(exported.data).not.toContain(excluded);
  }
  await expect(
    db
      .collection("auditLog")
      .countDocuments({ event: "child-data-viewed", childId }),
  ).resolves.toBe(2);
  await expect(
    db
      .collection("auditLog")
      .countDocuments({ event: "child-data-exported", childId }),
  ).resolves.toBe(1);
});

it("lets a linked parent view a flagged note but returns no file or export audit", async () => {
  const { childId } = await fixture();
  await withTransaction((tx) =>
    insertParentNote(tx, childId, "<b>Invented note</b>", "flagged"),
  );
  const review = await reviewChildData({ childId, password });
  if (!review.ok) throw new Error("Expected review to succeed");
  expect(review.data).toContain("<b>Invented note</b>");
  await expect(exportChildData({ childId, password })).resolves.toMatchObject({
    error: { code: "EXPORT_UNAVAILABLE" },
  });
  await expect(
    getDb()
      .collection("auditLog")
      .countDocuments({ event: "child-data-exported" }),
  ).resolves.toBe(0);
});
