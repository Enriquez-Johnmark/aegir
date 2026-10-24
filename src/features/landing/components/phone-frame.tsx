import { cn } from "cn";
import Image from "next/image";

import { FullSizeHint, type Band } from "@/features/landing/components/screenshot-frame";
import type { Screenshot } from "@/features/landing/screenshots";

const percent = (value: number) => `${value * 100}%`;

/**
 * A phone capture (Pixel 7) at phone width, in a rounded hairline frame, showing the
 * band `crop` of it. Unlike `ScreenshotFrame` it never zooms: a phone screen is
 * already readable at this size. Opens the full capture in a new tab (D-051).
 */
export function PhoneFrame({ shot, crop, className }: { shot: Screenshot; crop: Band; className?: string }) {
  const { width, height } = shot.src;
  return (
    <a
      href={shot.src.src}
      target="_blank"
      rel="noopener"
      className={cn("group flex w-full max-w-80 flex-col gap-2 outline-none", className)}
    >
      <span
        className="relative block aspect-(--phone-aspect) overflow-hidden rounded-[1.75rem] bg-muted ring-1 ring-foreground/15 group-focus-visible:ring-3 group-focus-visible:ring-ring/50"
        style={
          {
            "--phone-aspect": `${width} / ${height * crop.height}`,
            "--phone-top": percent(-crop.top / crop.height),
          } as React.CSSProperties
        }
      >
        <Image
          src={shot.src}
          alt={shot.alt}
          placeholder="blur"
          sizes="20rem"
          className="absolute top-(--phone-top) left-0 h-auto w-full max-w-none"
        />
      </span>
      <FullSizeHint />
    </a>
  );
}
