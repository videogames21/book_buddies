import Link from "next/link";
import styles from "./child.module.css";
import { CHILD_SHELF_PATH } from "./paths";

// A page that a later use case builds, here only so the shelf's links lead somewhere and
// back. It reads and shows nothing about a child, so it checks no session.
export function Placeholder({ title }: { title: string }) {
  return (
    <main className={styles.page}>
      <h1>{title}</h1>
      <p>This is coming soon.</p>
      <Link
        className={styles.secondary}
        href={CHILD_SHELF_PATH}
        prefetch={false}
      >
        Back to My Shelf
      </Link>
    </main>
  );
}
