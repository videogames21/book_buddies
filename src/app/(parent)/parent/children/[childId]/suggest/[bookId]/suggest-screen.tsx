import Image from "next/image";
import Link from "next/link";
import { avatarSrc, type AvatarKey } from "@/server/accounts-family/avatars";
import type { SuggestionConflict } from "@/server/accounts-family/suggestions";
import styles from "../../../../books/books.module.css";
import { submitSuggestion } from "./actions";
import { SuggestForm } from "./suggest-form";

export type SuggestScreenView =
  | { kind: "noConsent"; nickname: string }
  | { kind: "excluded"; nickname: string }
  | {
      kind: "form";
      childId: string;
      bookId: string;
      nickname: string;
      avatar: AvatarKey;
      title: string;
      author: string;
      /** 4a, shown before the parent confirms. */
      conflict: SuggestionConflict | null;
    };

export type SuggestScreenProps = { view: SuggestScreenView };

export function SuggestScreen({ view }: SuggestScreenProps) {
  if (view.kind !== "form") {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Suggest a book</h1>
        {view.kind === "excluded" ? (
          // 1b: a report is final (BR-parent-report-book).
          <p>
            This book can’t be suggested to {view.nickname}, because it was
            reported for them.
          </p>
        ) : (
          <p>
            Your family’s consent must be confirmed before you can suggest a
            book to {view.nickname}.
          </p>
        )}
        <Link href="/parent/books">Back to the books</Link>
      </main>
    );
  }
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Suggest a book</h1>
      <p>
        <strong>{view.title}</strong>
        <span className={styles.author}>{view.author}</span>
      </p>
      <p className={styles.child}>
        <Image src={avatarSrc(view.avatar)} alt="" width={48} height={48} />
        <span>To {view.nickname}</span>
      </p>
      <SuggestForm
        // The route's IDs are bound here, on the server, never sent as form fields.
        action={submitSuggestion.bind(null, view.childId, view.bookId)}
        nickname={view.nickname}
        initialConflict={view.conflict}
      />
    </main>
  );
}
