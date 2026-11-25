import { redirect } from "next/navigation";
import {
  consentNotice,
  consentNoticeVersion,
} from "@/server/accounts-family/consent-notice";
import { getConfig, getPrivacyNoticeUrl } from "@/server/lib/config";
import { PARENT_HOME_PATH } from "@/app/(parent)/parent/onboarding/paths";
import { mustLeaveSignUp } from "./access";
import { SignUpForm } from "./sign-up-form";
import styles from "@/app/(parent)/parent/children/new/new-child.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create an account · BookBuddies" };

// UC-PAR-onboarding steps 1–2: the form, the direct notice with its version and the
// online privacy notice link (BR-coppa-notice, FR-ACCT-consent, FR-DATA-notice).
export default async function SignUpPage() {
  if (await mustLeaveSignUp()) redirect(PARENT_HOME_PATH);
  const days = getConfig().CONSENT_CONFIRMATION_DAYS;

  return (
    <main className={styles.page}>
      <SignUpForm
        notice={consentNotice(days)}
        noticeVersion={consentNoticeVersion(days)}
        privacyNoticeUrl={getPrivacyNoticeUrl()}
      />
    </main>
  );
}
