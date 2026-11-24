import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SignOutButton } from "@/app/sign-in/sign-out-button";
import { NOT_SENT_FLAG, SIGN_UP_PATH } from "../paths";
import { ResendButton } from "./resend-button";
import { checkEmailView } from "./view";
import styles from "@/app/sign-in/sign-in.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Check your email · BookBuddies" };

// UC-PAR-onboarding step 6, with 5b (the email could not be sent), 6a (expired) and 6b
// (resend). The token is never shown here; only the email holds it.
export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const view = await checkEmailView();
  if ("redirect" in view) redirect(view.redirect);
  if ("notFound" in view) notFound();

  if (view.state === "expired") {
    return (
      <main className={styles.page}>
        <div className={styles.form}>
          <p className={styles.brand}>BOOKBUDDIES</p>
          <h1>Your sign-up expired</h1>
          <p>
            Consent was not confirmed in time, so we are deleting the account.
            Please <Link href={SIGN_UP_PATH}>start again</Link>.
          </p>
          <SignOutButton />
        </div>
      </main>
    );
  }

  const notSent = (await searchParams)[NOT_SENT_FLAG] === "1";
  return (
    <main className={styles.page}>
      <div className={styles.form}>
        <p className={styles.brand}>BOOKBUDDIES</p>
        <h1>Check your email</h1>
        <p>
          We sent you a link to confirm your consent. Open it and press Confirm,
          then you can add your child.
        </p>
        <ResendButton notSentAtStart={notSent} />
        <SignOutButton />
      </div>
    </main>
  );
}
