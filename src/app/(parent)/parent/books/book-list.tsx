import Link from "next/link";
import type { PickerBook } from "@/server/catalog/books";
import styles from "./books.module.css";

export type BookListProps = { books: PickerBook[] };

/** Step 1's list: title and author only, as the Catalog holds no cover. */
export function BookList({ books }: BookListProps) {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Suggest a book</h1>
      {books.length === 0 ? (
        <p>There are no books to suggest yet.</p>
      ) : (
        <ul className={styles.list}>
          {books.map((book) => (
            <li key={book.id} className={styles.item}>
              <span>
                <strong>{book.title}</strong>
                <span className={styles.author}>{book.author}</span>
              </span>
              <Link
                className={styles.action}
                href={`/parent/books/${encodeURIComponent(book.id)}/suggest`}
                aria-label={`Suggest ${book.title}`}
              >
                Suggest
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
