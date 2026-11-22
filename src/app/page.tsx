import { AppShell } from "@/components/app-shell";
import { FreeAccessBanner } from "@/components/header-bits";
import { TheoryLabClientWrapper } from "@/components/music/theory-lab-client-wrapper";
import { ProgressionClientWrapper } from "@/components/music/progression-client-wrapper";
import { requireCurrentUser } from "@/lib/auth";
import { canAccessMusicToolkit } from "@/lib/hub-access";

export default async function Home() {
  const user = await requireCurrentUser();
  const hasToolkitAccess = await canAccessMusicToolkit(user);
  const isFreeAccess = !hasToolkitAccess;

  return (
    <AppShell
      title="Music Toolkit"
      eyebrow="Theory and practice"
      description="Scales, chords, and progressions."
    >
      {isFreeAccess ? <FreeAccessBanner /> : null}
      <TheoryLabClientWrapper />
      <ProgressionClientWrapper />
    </AppShell>
  );
}
