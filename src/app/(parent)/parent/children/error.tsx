"use client";
export default function ChildAccountError({ reset }: { reset: () => void }) {
  return (
    <main>
      <h1>Something went wrong</h1>
      <p>Please try again in a moment.</p>
      <button
        onClick={() => {
          reset();
        }}
      >
        Try again
      </button>
    </main>
  );
}
