import Image from "next/image";
import Link from "next/link";
import { avatarSrc, type AvatarKey } from "@/server/accounts-family/avatars";
import styles from "../../books.module.css";

export type ChildPickerView =
  | { kind: "noChild" }
  | {
      kind: "children";
      bookId: string;
      /** Nickname and avatar only (BR-kid-anonymous-profile). */
      children: { id: string; nickname: string; avatar: AvatarKey }[];
    };

export type ChildPickerProps = { view: ChildPickerView };

export function ChildPicker({ view }: ChildPickerProps) {
  if (view.kind === "noChild") {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>No child to suggest to yet</h1>
        <p>Ask the family’s Main Parent to add a child first.</p>
      </main>
    );
  }
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Suggest to which child?</h1>
      <ul className={styles.list}>
        {view.children.map((child) => (
          <li key={child.id}>
            <Link
              className={styles.child}
              href={`/parent/children/${child.id}/suggest/${view.bookId}`}
            >
              <Image
                src={avatarSrc(child.avatar)}
                alt=""
                width={48}
                height={48}
              />
              <span>{child.nickname}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/parent/books">Back to the books</Link>
    </main>
  );
}
