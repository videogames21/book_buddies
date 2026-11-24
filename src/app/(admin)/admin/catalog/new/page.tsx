import { listCustomTags } from "@/server/catalog/books";
import { requireAdminPage } from "../../access";
import { NewBookForm } from "./new-book-form";
import styles from "./new-book.module.css";

export const metadata = { title: "Add a book · BookBuddies" };

// UC-ADM-add-content steps 1 to 3. The page checks the admin itself (§8.1); the action
// checks again, because an action can be called without the page.
export default async function NewBookPage() {
  const admin = await requireAdminPage();
  const existingCustomTags = await listCustomTags(admin);

  return (
    <main className={styles.page}>
      <NewBookForm existingCustomTags={existingCustomTags} />
    </main>
  );
}
