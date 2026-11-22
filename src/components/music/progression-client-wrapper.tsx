"use client";

import dynamic from "next/dynamic";

// Wrap ProgressionClient in a client component so `next/dynamic` with `ssr: false` works.
// The home page is a Server Component and cannot use `dynamic` directly.
const ProgressionClient = dynamic(
  () => import("@/components/music/progression-client").then((m) => m.ProgressionClient),
  { ssr: false },
);

export function ProgressionClientWrapper() {
  return <ProgressionClient />;
}
