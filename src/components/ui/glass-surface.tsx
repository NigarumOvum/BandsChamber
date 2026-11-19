"use client";

import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

import { Glass, type GlassOptics } from "@samasante/liquid-glass";

/**
 * Site-tuned optics for the liquid-glass material. Sits on top of the CSS glass
 * layer (`.panel`, `.glass-pill`, `.glass-card-soft` in `globals.css`), so the
 * numbers are deliberately gentler than the library default: a softer frost
 * keeps long-form studio content legible and a brighter rim keeps the glass edge
 * readable in both light and dark themes.
 */
export const liquidGlassOptics: Partial<GlassOptics> = {
  strength: 0.06,
  depth: 0.5,
  curvature: 0.26,
  bend: 0.5,
  bendWidth: 0.18,
  dispersion: 0.32,
  frost: 22,
  saturate: 1.5,
  sheen: 0.38,
  sheenWidth: 2.5,
  sheenFalloff: 1.6,
  glow: 0.12,
  glowSpread: 1,
  glowFalloff: 0.5,
  specular: 1.05,
  sheenAngle: 45,
  brightness: 0.02,
};

export type GlassSurfaceProps = {
  children?: ReactNode;
  /**
   * Layout of the glass wrapper. Defaults to `block` — the library defaults to
   * `inline-block`, which would re-flow the panels/pills it replaces.
   */
  display?: CSSProperties["display"];
  /** Corner radius in px. Omit to inherit the element's CSS border-radius. */
  radius?: number;
  /** Per-surface optic overrides merged over {@link liquidGlassOptics}. */
  optics?: Partial<GlassOptics>;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

/**
 * The app-wide liquid-glass surface: a thin wrapper over
 * `@samasante/liquid-glass`'s `<Glass>` material with the site optics and a
 * block-level default. Keep the existing CSS glass classes on `className` — they
 * provide the tint/fallback and this adds the live refraction, rim and sheen.
 */
export function GlassSurface({
  children,
  className,
  style,
  display = "block",
  radius,
  optics,
  ...rest
}: GlassSurfaceProps) {
  return (
    <Glass
      className={className}
      radius={radius}
      optics={{ ...liquidGlassOptics, ...optics }}
      style={{ display, ...style }}
      {...rest}
    >
      {children}
    </Glass>
  );
}

export type GlassControlProps = GlassSurfaceProps & {
  /**
   * Stretch the wrapper to its container instead of hugging the control. Use
   * for controls that carry `w-full`; the control itself must also be `w-full`.
   */
  fullWidth?: boolean;
};

/**
 * Wraps a native control (`button`/`a`/`label`/`select`…) in the glass lens.
 * The wrapper hugs the control so the refraction lens matches the control's box
 * in flex/grid rows; the control keeps its `glass-pill` classes, whose
 * backgrounds are translucent in `globals.css` so this material reads through.
 */
export function GlassControl({ className, fullWidth = false, ...rest }: GlassControlProps) {
  return (
    <GlassSurface
      display={fullWidth ? "flex" : "inline-flex"}
      className={`${fullWidth ? "w-full" : "w-fit max-w-full"}${className ? ` ${className}` : ""}`}
      {...rest}
    />
  );
}
