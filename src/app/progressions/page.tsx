import { redirect } from "next/navigation";

// Progressions moved to the home page; this route redirects there.
export default function ProgressionsPage() {
  redirect("/");
}
