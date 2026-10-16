import Image from "next/image";

import type { Screenshot } from "@/features/landing/screenshots";

// The app's sidebar is 256 CSS px of every 1440 px desktop capture (512 of 2880).
const SIDEBAR_FRACTION = 512 / 2880;

/** A region of a screenshot, in fractions of its width and height. */
export type Region = { x: number; y: number; width: number; height: number };

const percent = (value: number) => `${value * 100}%`;

/**
 * A desktop screenshot shown through a clipping frame, never stretched.
 *
 * From 48rem of section width (`@3xl`; the section is the query container) it shows
 * the page content: the sidebar cut off on the left and the bottom cut at
 * `visibleHeight`. Narrower, a whole desktop capture would shrink its text to a few
 * pixels, so the frame zooms to `focus`, the part the step is about. The switch is in
 * rem, so enlarged text gets the zoom too (DESIGN.md: container queries in rem).
 */
export function ScreenshotFrame({
  shot,
  visibleHeight = 1,
  focus,
  sizes,
}: {
  shot: Screenshot;
  visibleHeight?: number;
  focus: Region;
  /** The image's rendered width: wider than the frame by the crop (about 3x when zoomed). */
  sizes: string;
}) {
  const { width, height } = shot.src;
  const content: Region = { x: SIDEBAR_FRACTION, y: 0, width: 1 - SIDEBAR_FRACTION, height: visibleHeight };
  return (
    <div
      className="relative aspect-(--zoom-aspect) overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10 @3xl:aspect-(--full-aspect)"
      style={
        {
          "--zoom-aspect": `${width * focus.width} / ${height * focus.height}`,
          "--zoom-width": percent(1 / focus.width),
          "--zoom-left": percent(-focus.x / focus.width),
          "--zoom-top": percent(-focus.y / focus.height),
          "--full-aspect": `${width * content.width} / ${height * content.height}`,
          "--full-width": percent(1 / content.width),
          "--full-left": percent(-content.x / content.width),
        } as React.CSSProperties
      }
    >
      <Image
        src={shot.src}
        alt={shot.alt}
        placeholder="blur"
        sizes={sizes}
        className="absolute top-(--zoom-top) left-(--zoom-left) h-auto w-(--zoom-width) max-w-none @3xl:top-0 @3xl:left-(--full-left) @3xl:w-(--full-width)"
      />
    </div>
  );
}
