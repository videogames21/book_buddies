import Link from "next/link";
import styles from "../child.module.css";
import { CHILD_HOME_PATH } from "../paths";

export const metadata = { title: "My Shelf · BookBuddies" };

// Placeholder, so the home screen's link leads somewhere: UC-SHLF-kid-view-shelf is not
// built yet. It reads and shows nothing about a child.
export default function ChildShelfPage() {
  return (
    <main className={styles.page}>
      <h1>My Shelf</h1>
      <p>Your shelf is coming soon.</p>
      <Link
        className={styles.secondary}
        href={CHILD_HOME_PATH}
        prefetch={false}
      >
        Back
      </Link>
    </main>
  );
}
