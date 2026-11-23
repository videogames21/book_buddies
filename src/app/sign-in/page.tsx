import { SignInForm } from "./sign-in-form";
import styles from "./sign-in.module.css";

export const metadata = { title: "Sign in · BookBuddies" };

export default function SignInPage() {
  return (
    <main className={styles.page}>
      <SignInForm />
    </main>
  );
}
