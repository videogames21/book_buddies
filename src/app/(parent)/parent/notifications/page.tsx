import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireParent } from "@/server/identity-access/sessions";
import { listParentWarnings } from "@/server/notification/parent-warnings";

export default async function ParentNotifications() {
  const parent = await requireParent();
  if (!parent.ok) {
    if (parent.error.code === "NOT_SIGNED_IN") redirect("/sign-in");
    notFound();
  }
  const warnings = await listParentWarnings(parent.data);
  return (
    <main>
      <p>
        <Link href="/parent">Back</Link>
      </p>
      <h1>Notifications</h1>
      {warnings.length ? (
        <ul>
          {warnings.map(({ _id, createdAt }) => (
            <li key={_id.toHexString()}>
              <time dateTime={createdAt.toISOString()}>
                {createdAt.toISOString().slice(0, 10)}
              </time>
              <p>
                False reports are not allowed and may lead to your account being
                suspended.
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p>You have no notifications.</p>
      )}
    </main>
  );
}
