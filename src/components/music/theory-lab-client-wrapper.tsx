"use client";

import dynamic from "next/dynamic";

const TheoryLabClient = dynamic(
  () => import("@/components/music/theory-lab-client").then((m) => m.TheoryLabClient),
  { ssr: false },
);

export function TheoryLabClientWrapper() {
  return <TheoryLabClient />;
}
