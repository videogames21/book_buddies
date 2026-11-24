// The fixed page forbidden() shows (UC-ADM-add-content 1a): HTTP 403, and nothing else.
export default function Forbidden() {
  return (
    <main
      style={{ maxWidth: "48rem", margin: "0 auto", padding: "3.5rem 1.5rem" }}
    >
      <h1>Not authorized</h1>
    </main>
  );
}
