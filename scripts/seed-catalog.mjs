// Demo seed: loads design/BookBuddies_Seed_Catalog.xlsx into the `books` collection as
// ACTIVE books, so the admin catalog list has content and a parent's reading-profile
// picker (which offers active books only) has books to choose. Outside the application.
//
// Every row goes through the same shared schema as the Add Book form
// (src/shared/catalog), so a row that would be refused there is skipped here and
// reported, never patched. Run by scripts/demo.mjs against its temporary database; it is
// not the catalog import (KD-catalog-import-offline), which has no design yet (OI-62).
//
//   MONGODB_URI=... MONGODB_DB=... node scripts/seed-catalog.mjs
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";
import { MongoClient } from "mongodb";

const sourceRoot = new URL("../src/", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(
        new URL(specifier.slice(2) + ".ts", sourceRoot).href,
        context,
      );
    }
    if (
      specifier.startsWith(".") &&
      context.parentURL?.startsWith(sourceRoot) &&
      !extname(specifier)
    ) {
      return nextResolve(
        new URL(specifier + ".ts", context.parentURL).href,
        context,
      );
    }
    return nextResolve(specifier, context);
  },
});
const { buildNewBookSchema, newBookErrorOf } =
  await import("../src/shared/catalog/new-book-schema.ts");
const { TAG_LISTS, isReadingLevelValid } =
  await import("../src/shared/catalog/tags.ts");

// ---- A minimal .xlsx reader (no dependency): a zip of XML files ----------------------

function unzipEntry(zip, name) {
  let end = zip.length - 22;
  while (end >= 0 && zip.readUInt32LE(end) !== 0x06054b50) end--;
  let pos = zip.readUInt32LE(end + 16);
  for (let i = 0; i < zip.readUInt16LE(end + 10); i++) {
    const method = zip.readUInt16LE(pos + 10);
    const size = zip.readUInt32LE(pos + 20);
    const nameLength = zip.readUInt16LE(pos + 28);
    const extraLength = zip.readUInt16LE(pos + 30);
    const commentLength = zip.readUInt16LE(pos + 32);
    const offset = zip.readUInt32LE(pos + 42);
    const entry = zip.toString("utf8", pos + 46, pos + 46 + nameLength);
    pos += 46 + nameLength + extraLength + commentLength;
    if (entry !== name) continue;
    const start =
      offset +
      30 +
      zip.readUInt16LE(offset + 26) +
      zip.readUInt16LE(offset + 28);
    const data = zip.subarray(start, start + size);
    return (method === 8 ? inflateRawSync(data) : data).toString("utf8");
  }
  throw new Error(`${name} is not in the workbook.`);
}

const decode = (text) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");

/** Rows as { rowNumber, A: text, B: text, ... } from the first worksheet. */
function readSheet(path) {
  const zip = readFileSync(path);
  const strings = [
    ...unzipEntry(zip, "xl/sharedStrings.xml").matchAll(
      /<si>([\s\S]*?)<\/si>/g,
    ),
  ].map(([, si]) =>
    decode(
      [...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""),
    ),
  );
  const sheet = unzipEntry(zip, "xl/worksheets/sheet1.xml");
  return [...sheet.matchAll(/<row [^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)].map(
    ([, rowNumber, cells]) => {
      const row = { rowNumber: Number(rowNumber) };
      for (const [, attrs, inner] of cells.matchAll(
        /<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,
      )) {
        const value = /<v>([\s\S]*?)<\/v>/.exec(inner ?? "")?.[1];
        if (value === undefined) continue;
        const column = /r="([A-Z]+)\d+"/.exec(attrs)[1];
        row[column] = /t="s"/.test(attrs)
          ? strings[Number(value)]
          : decode(value);
      }
      return row;
    },
  );
}

// ---- Rows to books -------------------------------------------------------------------

const list = (text) =>
  text
    ? text
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    : [];

// "AD730L (AR 3.8)" is a Lexile value with an AR note; keep the Lexile part when it is a
// valid reading level, and leave the optional field out otherwise.
function readingLevelOf(text) {
  const first = text?.trim().split(/\s+/)[0];
  return first && isReadingLevelValid(first) ? first : undefined;
}

const toInput = (row) => ({
  title: row.B,
  author: row.C,
  year: row.E,
  isbn: row.O ?? "",
  noIsbn: !row.O,
  genres: list(row.F),
  subjects: list(row.G),
  moods: list(row.H),
  format: row.J,
  length: row.K,
  ageMin: row.L,
  ageMax: row.M,
  readingChallenge: row.N,
  readingLevel: readingLevelOf(row.Q),
});

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
if (!uri || !dbName) throw new Error("Set MONGODB_URI and MONGODB_DB first.");
// Demo only: active books with no audit entries must never land in a real catalog.
if (!/demo|test/i.test(dbName)) {
  throw new Error(
    `Refusing to seed "${dbName}": the database name must contain "demo" or "test".`,
  );
}
const file = fileURLToPath(
  new URL("../design/BookBuddies_Seed_Catalog.xlsx", import.meta.url),
);

const schema = buildNewBookSchema({ tags: TAG_LISTS, now: new Date() });
const rows = readSheet(file).filter((row) => row.rowNumber >= 4 && row.B);
const client = new MongoClient(uri);
try {
  const books = client.db(dbName).collection("books");
  const base = Date.now();
  let added = 0;
  const skipped = [];
  for (const [index, row] of rows.entries()) {
    const parsed = schema.safeParse(toInput(row));
    if (!parsed.success) {
      const { code, field } = newBookErrorOf(parsed.error);
      skipped.push(`row ${row.rowNumber} "${row.B}": ${code} (${field})`);
      continue;
    }
    try {
      await books.insertOne({
        ...parsed.data,
        _id: randomUUID(),
        status: "active",
        // Spreadsheet order, first row first, in the newest-first catalog list.
        createdAt: new Date(base - index),
      });
      added++;
    } catch (error) {
      if (error?.code !== 11000) throw error;
      skipped.push(`row ${row.rowNumber} "${row.B}": already in the catalog`);
    }
  }
  console.log(`Seeded ${added} of ${rows.length} catalog books as active.`);
  for (const line of skipped) console.log(`  skipped ${line}`);
} finally {
  await client.close();
}
