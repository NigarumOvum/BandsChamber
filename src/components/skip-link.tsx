"use client";

import { useI18n } from "@/components/language-provider";

export function SkipLink() {
  const { t } = useI18n();

  return (
    <a
      href="#main-content"
      className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--color-foreground)] focus:px-4 focus:py-3 focus:text-[var(--color-background)] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--color-mint)]"
    >
      {t("a11y.skipToMain")}
    </a>
  );
}
