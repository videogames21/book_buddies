import type { ReactNode } from "react";
import { getPrivacyNoticeUrl } from "@/server/lib/config";
import styles from "./child/child.module.css";

// Every child page. The privacy notice is linked from the child's home screen and from
// every place information is collected from a child (BR-coppa-notice, 16 CFR 312.4(d)).
// Each page and action checks the session itself; a layout is never the check (§8.1).
// Dynamic, so a build needs no configuration.
export const dynamic = "force-dynamic";

export default function ChildLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <footer className={styles.footer}>
        <a
          href={getPrivacyNoticeUrl()}
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy notice
        </a>
      </footer>
    </>
  );
}
