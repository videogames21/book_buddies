"use client";
import styles from "./child.module.css";

// The calm retry screen for every child page (§8.2.1). No detail of the error.
export default function ChildError({ reset }: { reset: () => void }) {
  return (
    <main className={styles.page}>
      <h1>Oops!</h1>
      <p>Something went wrong. Try again in a moment.</p>
      <button
        type="button"
        className={styles.primary}
        onClick={() => {
          reset();
        }}
      >
        Try again
      </button>
    </main>
  );
}
