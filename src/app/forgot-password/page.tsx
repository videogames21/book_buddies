import { ForgotPasswordForm } from "./forgot-password-form";
import styles from "@/app/sign-in/sign-in.module.css";

export const metadata = { title: "Forgot password · BookBuddies" };

// Password reset request (OI-44), linked from sign-in and from sign-up's 4a error.
export default function ForgotPasswordPage() {
  return (
    <main className={styles.page}>
      <ForgotPasswordForm />
    </main>
  );
}
