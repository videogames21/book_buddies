"use client";
import styles from "./child.module.css";

// The calm retry screen for every child page (§8.2.1). No detail of the error.
// retry() asks the server again; reset() would only re-render what already failed.
export default function ChildError({ retry }: { retry: () => void }) {
  return (
    <main className={styles.page}>
      <h1>Oops!</h1>
      <p>Something went wrong. Try again in a moment.</p>
      <button
        type="button"
        className={styles.primary}
        onClick={() => {
          retry();
        }}
      >
        Try again
      </button>
    </main>
  );
}
