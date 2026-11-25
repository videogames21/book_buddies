import { ResetForm } from "./reset-form";
import styles from "@/app/sign-in/sign-in.module.css";

export const metadata = {
  title: "Choose a new password · BookBuddies",
  referrer: "no-referrer" as const,
};

// Password reset (OI-44). Opening this page changes nothing: the token stays in the URL
// fragment until the parent submits a new password (design/par.md).
export default function ResetPasswordPage() {
  return (
    <main className={styles.page}>
      <ResetForm />
    </main>
  );
}
