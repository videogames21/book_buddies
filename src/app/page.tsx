import { redirect } from "next/navigation";

// There is no public landing page yet, so the app opens on parent sign-in.
export default function HomePage() {
  redirect("/sign-in");
}
