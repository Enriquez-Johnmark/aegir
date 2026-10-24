import { Maximize2Icon } from "lucide-react";
import Image from "next/image";

import type { Screenshot } from "@/features/landing/screenshots";

// The app's sidebar is 256 CSS px of every 1440 px desktop capture (512 of 2880).
export const SIDEBAR_FRACTION = 512 / 2880;

/** A region of a screenshot, in fractions of its width and height. */
export type Region = { x: number; y: number; width: number; height: number };

/** A horizontal band of a screenshot, in fractions of its height. */
export type Band = { top: number; height: number };

const percent = (value: number) => `${value * 100}%`;

/**
 * A desktop screenshot shown through a clipping frame, never stretched, that opens the
 * full-size capture in a new tab (the zoomed crops are a preview, not the evidence).
 *
 * From 48rem of frame width (`@3xl`; the nearest query container) it shows the page
 * content in the band `crop`, with the app sidebar cut off on the left. Narrower, a
 * whole desktop capture would shrink its text to a few pixels, so the frame zooms to
 * `focus`, the part the step is about. The switch is in rem, so enlarged text gets the
 * zoom too (DESIGN.md: container queries in rem).
 */
export function ScreenshotFrame({
  shot,
  crop = { top: 0, height: 1 },
  focus,
  sizes,
}: {
  shot: Screenshot;
  crop?: Band;
  focus: Region;
  /** The image's rendered width: wider than the frame by the crop (about 3x when zoomed). */
  sizes: string;
}) {
  const { width, height } = shot.src;
  const content: Region = { x: SIDEBAR_FRACTION, y: crop.top, width: 1 - SIDEBAR_FRACTION, height: crop.height };
  return (
    <a
      href={shot.src.src}
      target="_blank"
      rel="noopener"
      className="group relative block aspect-(--zoom-aspect) overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 @3xl:aspect-(--full-aspect)"
      style={
        {
          "--zoom-aspect": `${width * focus.width} / ${height * focus.height}`,
          "--zoom-width": percent(1 / focus.width),
          "--zoom-left": percent(-focus.x / focus.width),
          "--zoom-top": percent(-focus.y / focus.height),
          "--full-aspect": `${width * content.width} / ${height * content.height}`,
          "--full-width": percent(1 / content.width),
          "--full-left": percent(-content.x / content.width),
          "--full-top": percent(-content.y / content.height),
        } as React.CSSProperties
      }
    >
      <Image
        src={shot.src}
        alt={shot.alt}
        placeholder="blur"
        sizes={sizes}
        className="absolute top-(--zoom-top) left-(--zoom-left) h-auto w-(--zoom-width) max-w-none @3xl:top-(--full-top) @3xl:left-(--full-left) @3xl:w-(--full-width)"
      />
      {/* Icon-only on the zoomed crops, where a label would cover the part the step is about. */}
      <span className="absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded-md bg-background/90 p-1 text-xs font-medium text-foreground ring-1 ring-foreground/10 transition-colors group-hover:bg-background @3xl:right-2 @3xl:bottom-2 @3xl:px-2">
        <Maximize2Icon aria-hidden className="size-3.5" />
        <span className="sr-only @3xl:not-sr-only">Full size</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </span>
    </a>
  );
}
