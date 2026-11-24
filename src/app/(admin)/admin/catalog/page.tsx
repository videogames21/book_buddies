import Link from "next/link";
import { listBooksForAdmin, type AdminBookRow } from "@/server/catalog/books";
import { NEW_BOOK_PATH, requireAdminPage } from "../access";
import styles from "./catalog.module.css";

export const metadata = { title: "Catalog · BookBuddies" };

// UC-ADM-add-content step 7 (and step 1's Add Book button): every book, blocked ones
// included, newest first, with every stored field (design/adm.md).
const list = (values: string[] | undefined) => values?.join(", ") ?? "";
const COLUMNS: { label: string; cell: (book: AdminBookRow) => string }[] = [
  { label: "Title", cell: (b) => b.title },
  { label: "Author", cell: (b) => b.author },
  { label: "Year", cell: (b) => String(b.year) },
  { label: "ISBN", cell: (b) => b.isbn ?? "" },
  { label: "Genres", cell: (b) => list(b.genres) },
  { label: "Subjects", cell: (b) => list(b.subjects) },
  { label: "Moods", cell: (b) => list(b.moods) },
  { label: "Format", cell: (b) => b.format },
  { label: "Length", cell: (b) => b.length },
  { label: "Ages", cell: (b) => `${String(b.ageMin)}–${String(b.ageMax)}` },
  { label: "Reading challenge", cell: (b) => b.readingChallenge },
  { label: "Reading level", cell: (b) => b.readingLevel ?? "" },
  { label: "Custom tags", cell: (b) => list(b.customTags) },
  { label: "Match key", cell: (b) => b.matchKey },
  { label: "Status", cell: (b) => b.status },
  { label: "Added", cell: (b) => b.createdAt.toISOString().slice(0, 10) },
];
export default async function CatalogListPage() {
  const admin = await requireAdminPage();
  const books = await listBooksForAdmin(admin);

  return (
    <main className={styles.page}>
      <h1>Catalog</h1>
      <p>
        <Link className={styles.button} href={NEW_BOOK_PATH}>
          Add Book
        </Link>
      </p>
      {books.length === 0 ? (
        <p>There are no books in the catalog yet.</p>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <th key={column.label} scope="col">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id}>
                  {COLUMNS.map((column) => (
                    <td key={column.label}>{column.cell(book)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
