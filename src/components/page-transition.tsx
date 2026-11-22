"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type PageTransitionProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Replays the enter animation on pathname changes only, so query-string
 * navigations (studio tabs, filters) keep their current content and state.
 */
export function PageTransition({ children, className = "" }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <div key={pathname} className={`page-transition ${className}`.trim()}>
      {children}
    </div>
  );
}
