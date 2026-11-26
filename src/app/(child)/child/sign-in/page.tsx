import { redirect } from "next/navigation";
import { requireChild } from "@/server/identity-access/sessions";
import styles from "../child.module.css";
import { CHILD_HOME_PATH } from "../paths";
import { ChildSignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in · BookBuddies" };

// Open to anyone. A child who is already signed in goes home.
export default async function ChildSignInPage() {
  const session = await requireChild();
  if (session.ok) redirect(CHILD_HOME_PATH);
  return (
    <main className={styles.page}>
      <h1>Sign in</h1>
      <ChildSignInForm />
    </main>
  );
}
