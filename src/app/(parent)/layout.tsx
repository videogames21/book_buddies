import type { ReactNode } from "react";
import { requireParent } from "@/server/identity-access/sessions";
import { SignOutButton } from "@/app/sign-in/sign-out-button";
import styles from "./parent-layout.module.css";

// Every parent page (OI-44): a signed-in parent can sign out from anywhere in the parent
// area, including the child form a newly confirmed parent is sent to (8a). The button is
// only shown; each page and action still checks the session itself (§8.1).
export default async function ParentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireParent();
  return (
    <>
      {session.ok && (
        <header className={styles.bar}>
          <SignOutButton className={styles.signOut} />
        </header>
      )}
      {children}
    </>
  );
}
