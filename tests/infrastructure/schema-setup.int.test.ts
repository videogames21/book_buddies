import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, it } from "vitest";

it("runs the deployment setup command twice without duplicate-index failures", async () => {
  const run = promisify(execFile);
  for (let attempt = 0; attempt < 2; attempt++) {
    const { stdout } = await run(
      process.execPath,
      ["--conditions=react-server", "scripts/ensure-indexes.mjs"],
      { env: process.env },
    );
    expect(stdout).toContain("collections and indexes are ready");
  }
});

it("creates readingProfiles with a unique childId index and a validator", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const profiles = getDb().collection("readingProfiles");
  const indexes = await profiles.indexes();
  expect(
    indexes.find((index) => index.name === "childId_unique"),
  ).toMatchObject({ key: { childId: 1 }, unique: true });
  // The backstop rejects a document that stores a child detail (KD-pii-segregation).
  await expect(
    profiles.insertOne({
      childId: "c",
      interests: [],
      favoriteBookIds: [],
      onboardingComplete: true,
      savedAt: new Date(),
      age: 8,
    }),
  ).rejects.toThrow();
  await profiles.deleteMany({});
});

it("creates the three shelf collections with a unique childId and bookId index", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  for (const name of ["shelfEntries", "ratings", "finishConfirmations"]) {
    const indexes = await getDb().collection(name).indexes();
    expect(
      indexes.find((index) => index.name === "childId_bookId_unique"),
      name,
    ).toMatchObject({ key: { childId: 1, bookId: 1 }, unique: true });
  }
});

it("refuses a second shelf entry, rating or confirmation for the same child and book", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ObjectId } = await import("mongodb");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const when = new Date("2026-11-01T12:00:00Z");
  const entry = {
    childId: "c1",
    bookId: "b1",
    category: "wantToRead",
    movedAt: when,
  };
  const rating = {
    childId: "c1",
    bookId: "b1",
    value: "lovedIt",
    ratedAt: when,
  };
  const confirmation = {
    childId: "c1",
    bookId: "b1",
    confirmedByParentId: new ObjectId(),
    confirmedAt: when,
  };
  const cases = [
    ["shelfEntries", entry],
    ["ratings", rating],
    ["finishConfirmations", confirmation],
  ] as const;
  for (const [name, doc] of cases) {
    const collection = getDb().collection(name);
    await collection.deleteMany({});
    await collection.insertOne({ ...doc });
    await expect(collection.insertOne({ ...doc }), name).rejects.toThrow();
    await collection.deleteMany({});
  }
});

it("rejects a shelf document that holds a child detail or an unknown value (KD-pii-segregation)", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ObjectId } = await import("mongodb");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const when = new Date("2026-11-01T12:00:00Z");
  const bad = [
    [
      "shelfEntries",
      {
        childId: "c",
        bookId: "b",
        category: "finished",
        movedAt: when,
        nickname: "Starfish",
      },
    ],
    [
      "shelfEntries",
      { childId: "c", bookId: "b", category: "favorites", movedAt: when },
    ],
    [
      "ratings",
      { childId: "c", bookId: "b", value: "five stars", ratedAt: when },
    ],
    [
      "ratings",
      { childId: "c", bookId: "b", value: "lovedIt", ratedAt: when, age: 8 },
    ],
    [
      "finishConfirmations",
      {
        childId: "c",
        bookId: "b",
        confirmedByParentId: "a parent",
        confirmedAt: when,
      },
    ],
    [
      "finishConfirmations",
      {
        childId: "c",
        bookId: "b",
        confirmedByParentId: new ObjectId(),
        confirmedAt: when,
        note: "free text",
      },
    ],
  ] as const;
  for (const [name, doc] of bad) {
    await expect(
      getDb()
        .collection(name)
        .insertOne({ ...doc }),
      `${name}: ${JSON.stringify(doc)}`,
    ).rejects.toThrow();
  }
});

// UC-ADM-add-content, "Schema validator": the MongoDB backstop for the `books` collection.
it("validates books and keeps the two unique indexes", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  const { insertBook } = await import("../fixtures/catalog");
  await ensureIndexes(getDb());
  const books = getDb().collection("books");
  await books.deleteMany({});

  const indexes = await books.indexes();
  expect(indexes.find((i) => i.name === "matchKey_unique")).toMatchObject({
    key: { matchKey: 1 },
    unique: true,
  });
  expect(indexes.find((i) => i.name === "isbn_unique")).toMatchObject({
    key: { isbn: 1 },
    unique: true,
    partialFilterExpression: { isbn: { $type: "string" } },
  });

  // A book with no isbn field is accepted, and two of them do not collide.
  await insertBook("draft", "No ISBN One");
  await insertBook("draft", "No ISBN Two");

  // Each of these is refused by MongoDB, not by application code.
  await expect(
    insertBook("draft", "Bad", { status: "live" }),
  ).rejects.toThrow();
  await expect(insertBook("draft", "Bad", { genres: [] })).rejects.toThrow();
  await expect(insertBook("draft", "Bad", { moods: [] })).rejects.toThrow();
  await expect(
    insertBook("draft", "Bad", { isbn: "123456789012" }),
  ).rejects.toThrow();
  await expect(
    insertBook("draft", "Bad", { title: undefined }),
  ).rejects.toThrow();
  for (const field of [
    "author",
    "matchKey",
    "year",
    "format",
    "length",
    "ageMin",
    "ageMax",
    "readingChallenge",
    "status",
    "createdAt",
  ])
    await expect(
      insertBook("draft", "Bad", { [field]: undefined }),
    ).rejects.toThrow();
  // Wrong types are refused too.
  for (const change of [
    { year: "2001" },
    { year: 2001.5 },
    { ageMin: "6" },
    { ageMax: 8.5 },
    { createdAt: "2026-01-01" },
    { genres: "fantasy" },
    { customTags: [1] },
  ])
    await expect(insertBook("draft", "Bad", change)).rejects.toThrow();
  // The ISBN must be exactly 13 digits: not 14, and not letters.
  for (const isbn of ["97804390234811", "978043902348X", " 9780439023481"])
    await expect(insertBook("draft", "Bad", { isbn })).rejects.toThrow();
  await insertBook("draft", "Good ISBN", { isbn: "9780439023481" });
  await books.deleteOne({ isbn: "9780439023481" });

  // The validator does not check tag values, so adding one to tags.ts needs no collMod.
  await insertBook("draft", "Unlisted Tag", { genres: ["a-new-genre"] });
  await books.deleteMany({});
});

it("accepts an admin's catalog audit entry with a book ID and no childId", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  const { ObjectId } = await import("mongodb");
  await ensureIndexes(getDb());
  const audit = getDb().collection("auditLog");
  await expect(
    audit.insertOne({
      actorId: new ObjectId(),
      actorRole: "admin",
      event: "catalog.book_added",
      recordId: "6b0f2c6e-0f3c-4b5e-9d51-0c2d5e1a7a11",
      occurredAt: new Date(),
    }),
  ).resolves.toBeTruthy();
  await audit.deleteMany({});
});

it("keeps each audit event's required shape", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  const { ObjectId } = await import("mongodb");
  await ensureIndexes(getDb());
  const audit = getDb().collection("auditLog");
  const note = {
    actorId: new ObjectId(),
    actorRole: "parent",
    event: "parent-note-flagged",
    childId: "child-1",
    recordId: new ObjectId(),
    occurredAt: new Date(),
  };
  const catalog = {
    actorId: new ObjectId(),
    actorRole: "admin",
    event: "catalog.book_added",
    recordId: "6b0f2c6e-0f3c-4b5e-9d51-0c2d5e1a7a11",
    occurredAt: new Date(),
  };
  await expect(audit.insertOne({ ...note })).resolves.toBeTruthy();
  await expect(audit.insertOne({ ...catalog })).resolves.toBeTruthy();

  // A note flag must name its child, a parent and an ObjectId record.
  const { childId: _omitted, ...noChild } = note;
  await expect(audit.insertOne(noChild)).rejects.toThrow();
  await expect(
    audit.insertOne({ ...note, actorRole: "admin" }),
  ).rejects.toThrow();
  await expect(
    audit.insertOne({ ...note, recordId: "a-string" }),
  ).rejects.toThrow();
  // A catalog entry has no child, an admin and a string record.
  await expect(
    audit.insertOne({ ...catalog, childId: "child-1" }),
  ).rejects.toThrow();
  await expect(
    audit.insertOne({ ...catalog, actorRole: "parent" }),
  ).rejects.toThrow();
  await expect(
    audit.insertOne({ ...catalog, recordId: new ObjectId() }),
  ).rejects.toThrow();
  // Events mixed across shapes are refused.
  await expect(
    audit.insertOne({ ...catalog, event: "parent-note-flagged" }),
  ).rejects.toThrow();
  await audit.deleteMany({});
});

it("makes users.email unique where set, so 4a is race-free (UC-PAR-onboarding)", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const users = getDb().collection("users");
  await users.insertOne({ role: "parent", email: "taken@example.test" });
  await expect(
    users.insertOne({ role: "parent", email: "taken@example.test" }),
  ).rejects.toThrow(/duplicate key/);
  // Children have no email, so many users without one are allowed.
  await users.insertMany([{ role: "child" }, { role: "child" }]);
  await users.deleteMany({});
});

it("makes signInAttempts unique per account key and indexes its expiry", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const attempts = getDb().collection("signInAttempts");
  const indexes = await attempts.indexes();
  expect(
    indexes.find((index) => index.name === "accountKey_unique"),
  ).toMatchObject({ key: { accountKey: 1 }, unique: true });
  expect(indexes.find((index) => index.name === "expiresAt")).toMatchObject({
    key: { expiresAt: 1 },
  });
  const row = {
    accountKey: "invented@example.test",
    failures: 0,
    allowedAt: new Date(),
    expiresAt: new Date(),
  };
  await attempts.insertOne({ ...row });
  await expect(attempts.insertOne({ ...row })).rejects.toThrow(/duplicate key/);
  // The in-flight count (checkPasswordAttempt) is optional and never negative.
  await attempts.insertOne({
    ...row,
    accountKey: "pending@example.test",
    pending: 2,
  });
  await expect(
    attempts.insertOne({
      ...row,
      accountKey: "negative@example.test",
      pending: -1,
    }),
  ).rejects.toThrow();
  await attempts.deleteMany({});
});

it("creates consentRecords with a unique familyId and a validator (DI-consent-record)", async () => {
  const { ObjectId } = await import("mongodb");
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const records = getDb().collection("consentRecords");
  const familyId = new ObjectId();
  const record = {
    familyId,
    parentUserId: new ObjectId(),
    noticeVersion: "v1",
    method: "email-plus",
    acknowledgedAt: new Date(),
    confirmBy: new Date(),
    confirmationTokenHash: "a".repeat(64),
  };
  await records.insertOne({ ...record });
  await expect(records.insertOne({ ...record })).rejects.toThrow(
    /duplicate key/,
  );
  await expect(
    records.insertOne({ ...record, familyId: new ObjectId() }),
  ).rejects.toThrow(/confirmationTokenHash_unique/);
  // A record missing the acknowledgment fields, or storing the plaintext token, is refused.
  await expect(
    records.insertOne({ familyId: new ObjectId(), confirmedAt: new Date() }),
  ).rejects.toThrow();
  await expect(
    records.insertOne({
      ...record,
      familyId: new ObjectId(),
      confirmationToken: "plaintext",
    }),
  ).rejects.toThrow();
  await records.deleteMany({});
});

it("creates passwordResets with one row per user and per token hash, and a validator (OI-44)", async () => {
  const { ObjectId } = await import("mongodb");
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const resets = getDb().collection("passwordResets");
  const row = {
    userId: new ObjectId(),
    tokenHash: "b".repeat(64),
    issuedAt: new Date(),
    expiresAt: new Date(),
  };
  await resets.insertOne({ ...row });
  await expect(
    resets.insertOne({ ...row, tokenHash: "c".repeat(64) }),
  ).rejects.toThrow(/userId_unique/);
  await expect(
    resets.insertOne({ ...row, userId: new ObjectId() }),
  ).rejects.toThrow(/tokenHash_unique/);
  // The plaintext token, or a row with no expiry, is refused.
  await expect(
    resets.insertOne({ ...row, userId: new ObjectId(), token: "plaintext" }),
  ).rejects.toThrow();
  const { expiresAt: _dropped, ...noExpiry } = row;
  await expect(
    resets.insertOne({ ...noExpiry, userId: new ObjectId() }),
  ).rejects.toThrow();
  expect(
    (await resets.indexes()).find((index) => index.name === "expiresAt"),
  ).toMatchObject({ key: { expiresAt: 1 } });
  await resets.deleteMany({});
});

it("accepts exactly the audit shapes §8.2.9 allows, IDs only", async () => {
  const { ObjectId } = await import("mongodb");
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const audit = getDb().collection("auditLog");
  const occurredAt = new Date();
  await audit.insertOne({
    actorRole: "system",
    event: "account.unconfirmed-purged",
    userId: new ObjectId(),
    familyId: new ObjectId(),
    occurredAt,
  });
  await audit.insertOne({
    actorId: new ObjectId(),
    actorRole: "parent",
    event: "account.password-reset",
    userId: new ObjectId(),
    occurredAt,
  });
  // No email or name may ride along on a purge entry.
  await expect(
    audit.insertOne({
      actorRole: "system",
      event: "account.unconfirmed-purged",
      userId: new ObjectId(),
      familyId: new ObjectId(),
      email: "someone@example.test",
      occurredAt,
    }),
  ).rejects.toThrow();
  // A purge cannot claim a parent actor.
  await expect(
    audit.insertOne({
      actorRole: "parent",
      event: "account.unconfirmed-purged",
      userId: new ObjectId(),
      familyId: new ObjectId(),
      occurredAt,
    }),
  ).rejects.toThrow();
  // A child deletion (UC-PAR-delete-kid-account POST-5): the parent and the child ID,
  // with no record and nothing else.
  const deletion = {
    actorId: new ObjectId(),
    actorRole: "parent",
    event: "child-account-deleted",
    childId: "6b0f2c6e-0f3c-4b5e-9d51-0c2d5e1a7a22",
    occurredAt,
  };
  await expect(audit.insertOne({ ...deletion })).resolves.toBeTruthy();
  const { childId: _noChild, ...deletionWithoutChild } = deletion;
  await expect(audit.insertOne(deletionWithoutChild)).rejects.toThrow();
  await expect(
    audit.insertOne({ ...deletion, nickname: "Starfish" }),
  ).rejects.toThrow();
  await expect(
    audit.insertOne({ ...deletion, actorRole: "admin" }),
  ).rejects.toThrow();
  await audit.deleteMany({});
});

it("creates bookReports and childBookExclusions with their indexes and validators (UC-PAR-report-book)", async () => {
  const { ObjectId } = await import("mongodb");
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const reports = getDb().collection("bookReports");
  const exclusions = getDb().collection("childBookExclusions");

  const reportIndexes = await reports.indexes();
  expect(reportIndexes.find((i) => i.name === "bookId_status")).toMatchObject({
    key: { bookId: 1, status: 1 },
  });
  expect(
    reportIndexes.find((i) => i.name === "status_reportedAt"),
  ).toMatchObject({ key: { status: 1, reportedAt: 1 } });
  expect(reportIndexes.find((i) => i.name === "childId")).toMatchObject({
    key: { childId: 1 },
  });
  expect(
    (await exclusions.indexes()).find(
      (i) => i.name === "childId_bookId_unique",
    ),
  ).toMatchObject({ key: { childId: 1, bookId: 1 }, unique: true });

  const report = {
    childId: "child-1",
    bookId: "book-1",
    reportedByUserId: new ObjectId(),
    reason: "inappropriate-content",
    comment: "Too scary",
    status: "open",
    reportedAt: new Date(),
  };
  await expect(reports.insertOne({ ...report })).resolves.toBeTruthy();
  // The shape UC-PAR-delete-kid-account leaves: no childId and no comment.
  const { childId: _c, comment: _m, ...afterDeletion } = report;
  await expect(reports.insertOne(afterDeletion)).resolves.toBeTruthy();
  // No role, child detail or off-list value may be stored.
  await expect(
    reports.insertOne({ ...report, reporterRole: "main" }),
  ).rejects.toThrow();
  await expect(reports.insertOne({ ...report, age: 8 })).rejects.toThrow();
  await expect(
    reports.insertOne({ ...report, reason: "boring" }),
  ).rejects.toThrow();
  await expect(
    reports.insertOne({ ...report, comment: "x".repeat(251) }),
  ).rejects.toThrow();

  const exclusion = {
    childId: "child-1",
    bookId: "book-1",
    reportId: new ObjectId(),
    createdAt: new Date(),
  };
  await exclusions.insertOne({ ...exclusion });
  await expect(exclusions.insertOne({ ...exclusion })).rejects.toThrow();
  await reports.deleteMany({});
  await exclusions.deleteMany({});
});

it("creates childNotices with a childId and seenAt index, holding the book ID only", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const notices = getDb().collection("childNotices");
  expect(
    (await notices.indexes()).find((i) => i.name === "childId_seenAt"),
  ).toMatchObject({ key: { childId: 1, seenAt: 1 } });
  const notice = {
    childId: "child-1",
    kind: "book-removed",
    bookId: "book-1",
    createdAt: new Date(),
  };
  await expect(notices.insertOne({ ...notice })).resolves.toBeTruthy();
  // No reason and no parent reach a child's notice (§8.2.11).
  await expect(
    notices.insertOne({ ...notice, reason: "inappropriate-content" }),
  ).rejects.toThrow();
  await expect(
    notices.insertOne({ ...notice, parentId: "p" }),
  ).rejects.toThrow();
  // A declined finish names no book; a removal must name one.
  const { bookId: _id, ...noBook } = notice;
  await expect(
    notices.insertOne({ ...noBook, kind: "finish-declined" }),
  ).resolves.toBeTruthy();
  await expect(
    notices.insertOne({ ...notice, kind: "finish-declined" }),
  ).rejects.toThrow();
  await expect(notices.insertOne({ ...noBook })).rejects.toThrow();
  const { createdAt: _at, ...undated } = notice;
  await expect(notices.insertOne({ ...undated })).rejects.toThrow();
  await expect(
    notices.insertOne({ ...noBook, kind: "invented-kind" }),
  ).rejects.toThrow();
  await notices.deleteMany({});
});

it("accepts the book report and parent shelf removal audit shapes, and refuses an extra field", async () => {
  const { ObjectId } = await import("mongodb");
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const audit = getDb().collection("auditLog");
  const reported = {
    actorId: new ObjectId(),
    actorRole: "parent",
    event: "book.reported",
    childId: "child-1",
    recordId: new ObjectId(),
    occurredAt: new Date(),
  };
  const removed = {
    ...reported,
    event: "shelf.parent-removed",
    bookId: "book-1",
  };
  await expect(audit.insertOne({ ...reported })).resolves.toBeTruthy();
  await expect(audit.insertOne({ ...removed })).resolves.toBeTruthy();
  await expect(
    audit.insertOne({ ...reported, comment: "text" }),
  ).rejects.toThrow();
  await expect(
    audit.insertOne({ ...reported, reason: "other" }),
  ).rejects.toThrow();
  await expect(
    audit.insertOne({ ...removed, nickname: "Starfish" }),
  ).rejects.toThrow();
  const { bookId: _b, ...removedNoBook } = removed;
  await expect(audit.insertOne(removedNoBook)).rejects.toThrow();
  await audit.deleteMany({});
});

it("lets children and consentRecords carry their write-lock counters only as integers", async () => {
  const { ObjectId } = await import("mongodb");
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const children = getDb().collection<
    { _id: string } & Record<string, unknown>
  >("children");
  const child = {
    _id: "00000000-0000-4000-8000-000000000001",
    familyId: new ObjectId(),
    nickname: "Starfish",
    avatar: "1-1",
    createdAt: new Date(),
  };
  await expect(
    children.insertOne({ ...child, writeVersion: 1 }),
  ).resolves.toBeTruthy();
  await expect(
    children.insertOne({
      ...child,
      _id: "00000000-0000-4000-8000-000000000002",
      writeVersion: "1",
    }),
  ).rejects.toThrow();
  await children.deleteMany({});

  const consent = getDb().collection("consentRecords");
  const record = (version: unknown) => ({
    familyId: new ObjectId(),
    parentUserId: new ObjectId(),
    noticeVersion: "test",
    method: "email-plus",
    acknowledgedAt: new Date(),
    confirmBy: new Date(),
    confirmationTokenHash: new ObjectId().toHexString().padEnd(64, "0"),
    consentWriteVersion: version,
  });
  await expect(consent.insertOne(record(1))).resolves.toBeTruthy();
  await expect(consent.insertOne(record("1"))).rejects.toThrow();
  await consent.deleteMany({});
});

it("accepts the child-deletion fields on children and consentRecords, and indexes what deletion looks up (UC-PAR-delete-kid-account)", async () => {
  const { ObjectId } = await import("mongodb");
  const { getDb } = await import("@/server/lib/db");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const children = getDb().collection<{
    _id: string;
    [field: string]: unknown;
  }>("children");
  const child = {
    _id: "6b0f2c6e-0f3c-4b5e-9d51-0c2d5e1a7a33",
    familyId: new ObjectId(),
    nickname: "Starfish",
    avatar: "1-1",
    createdAt: new Date(),
  };
  await children.insertOne({ ...child, writeVersion: 3 });
  await expect(
    children.insertOne({
      ...child,
      _id: "6b0f2c6e-0f3c-4b5e-9d51-0c2d5e1a7a34",
      writeVersion: "3",
    }),
  ).rejects.toThrow();

  const records = getDb().collection("consentRecords");
  const record = {
    familyId: new ObjectId(),
    parentUserId: new ObjectId(),
    noticeVersion: "v1",
    method: "email-plus",
    acknowledgedAt: new Date(),
    confirmBy: new Date(),
    confirmationTokenHash: "d".repeat(64),
  };
  await records.insertOne({
    ...record,
    removedChildren: [{ childId: child._id, removedAt: new Date() }],
  });
  // A removed-child entry holds the ID and the date only, never the nickname.
  await expect(
    records.insertOne({
      ...record,
      familyId: new ObjectId(),
      confirmationTokenHash: "e".repeat(64),
      removedChildren: [
        { childId: child._id, removedAt: new Date(), nickname: "Starfish" },
      ],
    }),
  ).rejects.toThrow();

  expect(
    (await getDb().collection("sessions").indexes()).find(
      (index) => index.name === "userId",
    ),
  ).toMatchObject({ key: { userId: 1 } });
  expect(
    (await getDb().collection("users").indexes()).find(
      (index) => index.name === "childId_unique",
    ),
  ).toMatchObject({ key: { childId: 1 }, unique: true });

  await children.deleteMany({});
  await records.deleteMany({});
});

it("creates recommendationBatches with its validator and three indexes (UC-REC-parent-review)", async () => {
  const { getDb } = await import("@/server/lib/db");
  const { ObjectId } = await import("mongodb");
  const { ensureIndexes } = await import("@/server/setup/ensure-indexes");
  await ensureIndexes(getDb());
  const batches = getDb().collection("recommendationBatches");
  const indexes = await batches.indexes();
  expect(
    indexes.find((index) => index.name === "childId_requestId_unique"),
  ).toMatchObject({ key: { childId: 1, requestId: 1 }, unique: true });
  expect(
    indexes.find((index) => index.name === "childId_pending_unique"),
  ).toMatchObject({
    key: { childId: 1 },
    unique: true,
    partialFilterExpression: { status: "pending" },
  });
  expect(
    indexes.find((index) => index.name === "childId_status_createdAt"),
  ).toMatchObject({ key: { childId: 1, status: 1, createdAt: 1 } });

  const at = new Date("2026-11-24T12:00:00Z");
  const batch = (overrides: Record<string, unknown> = {}) => ({
    _id: new ObjectId(),
    requestId: "11111111-1111-4111-8111-111111111111",
    childId: "c1",
    source: "rules",
    status: "pending",
    bookIds: ["b1", "b2"],
    createdAt: at,
    handoffDeadline: new Date("2026-11-25T12:00:00Z"),
    ...overrides,
  });
  await batches.insertOne(batch());
  // A second pending batch for the child, even for another request, is refused.
  await expect(
    batches.insertOne(
      batch({ requestId: "22222222-2222-4222-8222-222222222222" }),
    ),
  ).rejects.toThrow();
  // The same request again is refused by the request index, whatever its status.
  await expect(
    batches.insertOne(batch({ status: "released" })),
  ).rejects.toThrow();
  // A released or empty batch beside the pending one is allowed.
  await batches.insertOne(
    batch({
      requestId: "33333333-3333-4333-8333-333333333333",
      status: "empty",
      bookIds: [],
      removedBookIds: ["b3"],
      releasedAt: at,
    }),
  );
  // The validator: no batch without handoffDeadline, no status outside the three,
  // and no field the design does not name (raw quiz answers, age, scores).
  const noDeadline = Object.fromEntries(
    Object.entries(batch({ childId: "c2" })).filter(
      ([field]) => field !== "handoffDeadline",
    ),
  );
  await expect(batches.insertOne(noDeadline)).rejects.toThrow();
  await expect(
    batches.insertOne(batch({ childId: "c3", status: "expired" })),
  ).rejects.toThrow();
  await expect(
    batches.insertOne(batch({ childId: "c4", answers: { mood: "calm" } })),
  ).rejects.toThrow();
  await batches.deleteMany({});
});
