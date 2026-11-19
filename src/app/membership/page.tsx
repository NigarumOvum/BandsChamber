import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";
import { MembershipClient } from "@/components/membership/membership-client";
import { GlassSurface } from "@/components/ui/glass-surface";

export default function MembershipPage() {
  return (
    <AppShell
      title="Membership"
      eyebrow="Plans & billing"
      description="Support the project and unlock the full studio. Checkout is handled securely by PayPal."
    >
      <Suspense fallback={<GlassSurface className="panel min-h-[280px] rounded-[1.75rem]" />}>
        <MembershipClient />
      </Suspense>
    </AppShell>
  );
}
