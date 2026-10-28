import { notFound, redirect } from "next/navigation";
import { CHECK_EMAIL_PATH, checkCreateChildAccess, SIGN_IN_PATH } from "./access";
import { NewChildForm } from "./new-child-form";
import styles from "./new-child.module.css";

export const metadata = { title: "Add a child · BookBuddies" };

// UC-PAR-create-kid-account steps 1–2. The page checks access itself (§8.1); the
// action checks again, because an action can be called without the page.
export default async function NewChildPage() {
  const access = await checkCreateChildAccess();

  if (!access.ok) {
    switch (access.error.code) {
      case "NOT_SIGNED_IN":
        redirect(SIGN_IN_PATH);
      case "NOT_A_PARENT":
        notFound();
      case "CONSENT_NOT_CONFIRMED":
        redirect(CHECK_EMAIL_PATH); // 1c
      case "NOT_MAIN_PARENT":
        return (
          <main className={styles.page}>
            <h1>Add a child</h1>
            <p role="status">{access.error.message} Ask your family&apos;s Main Parent to add a child for you.</p>
          </main>
        ); // 1b
    }
  }

  return (
    <main className={styles.page}>
      <NewChildForm />
    </main>
  );
}
