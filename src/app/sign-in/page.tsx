import { PASSWORD_CHANGED_FLAG } from "@/app/(parent)/parent/onboarding/paths";
import { SignInForm } from "./sign-in-form";
import styles from "./sign-in.module.css";

export const metadata = { title: "Sign in · BookBuddies" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const passwordChanged = (await searchParams)[PASSWORD_CHANGED_FLAG] === "1";
  return (
    <main className={styles.page}>
      <SignInForm passwordChanged={passwordChanged} />
    </main>
  );
}
