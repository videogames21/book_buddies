import type { ReactNode } from "react";
import { getConfig, getPrivacyNoticeUrl } from "@/server/lib/config";
import styles from "./child/child.module.css";
import { KeepAlive } from "./keep-alive";

// Every child page. The privacy notice is linked from the child's home screen and from
// every place information is collected from a child (BR-coppa-notice, 16 CFR 312.4(d)).
// A layout is never the session check (§8.1): a page or action that reads or changes a
// child's data checks the session itself. The placeholder pages do neither, so they
// check nothing. Dynamic, so a build needs no configuration.
export const dynamic = "force-dynamic";

export default function ChildLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <KeepAlive seconds={getConfig().CHILD_KEEPALIVE_SECONDS} />
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
