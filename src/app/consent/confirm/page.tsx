import { ConfirmForm } from "./confirm-form";
import styles from "@/app/sign-in/sign-in.module.css";

export const metadata = {
  title: "Confirm your consent · BookBuddies",
  referrer: "no-referrer" as const,
};

// UC-PAR-onboarding step 7. Opening this page confirms nothing: mail scanners open links
// before a person does, so only the button sends the token (design/par.md).
export default function ConfirmConsentPage() {
  return (
    <main className={styles.page}>
      <ConfirmForm />
    </main>
  );
}
