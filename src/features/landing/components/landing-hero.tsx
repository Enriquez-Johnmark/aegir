import { cn } from "cn";
import { CircleAlertIcon, ClockAlertIcon, OctagonAlertIcon } from "lucide-react";
import { getImageProps } from "next/image";

import { Badge } from "@/components/ui/badge";
import { RolePicker } from "@/features/landing/components/role-picker";
import { SCREENSHOTS } from "@/features/landing/screenshots";

/**
 * Signals lit over the dimmed desktop screenshot, each laid over the badge it
 * repeats (in % of the image, measured on docs/screenshots/dashboard.png). The lit
 * badge is larger than the one in the capture, so it is anchored at the original's
 * edge that has open space beside it (`x` is that edge) and grows away from its
 * neighbours. They copy what the screenshot shows, so they are hidden from screen
 * readers; the image's alt text carries the facts.
 */
const LIT_SIGNALS = [
  { x: "36.35%", y: "31.3%", anchor: "start", delay: "[animation-delay:300ms]", variant: "destructive", icon: ClockAlertIcon, label: "2 overdue" },
  { x: "58.6%", y: "31.3%", anchor: "start", delay: "[animation-delay:700ms]", variant: "warning", icon: CircleAlertIcon, label: "1 blocked" },
  { x: "56.9%", y: "63.6%", anchor: "end", delay: "[animation-delay:1100ms]", variant: "destructive", icon: OctagonAlertIcon, label: "Critical" },
] as const;

export function LandingHero() {
  return (
    <section aria-labelledby="hero-title" className="dark night @container overflow-hidden bg-background text-foreground">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 pt-12 sm:px-8 @5xl:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] @5xl:gap-16 @5xl:pt-20">
        <div className="flex flex-col gap-8 @5xl:pb-24">
          <div className="flex flex-col gap-5">
            <h1
              id="hero-title"
              className="text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-5xl lg:text-[3.5rem]"
            >
              Every failed check stays in sight until the work is done.
            </h1>
            <p className="max-w-[34rem] text-lg/relaxed text-pretty text-muted-foreground">
              Vessels, safety inspections, work orders and shift handovers for a fleet, in one audited workspace.
            </p>
          </div>
          <RolePicker />
          <p className="text-sm text-muted-foreground">
            A portfolio project with synthetic data. Not a certified maritime safety system.
          </p>
        </div>
        <HeroScreenshot />
      </div>
    </section>
  );
}

/**
 * The real dashboard rising out of the bottom of the hero and running off its right
 * edge: the desktop capture from 64rem up, the phone capture below (art direction
 * with getImageProps). The hero's columns switch at the same 64rem (`@5xl`, the
 * section is full width), so the lit signals only ever sit on the desktop capture;
 * with enlarged text the layout stacks and the signals stay hidden.
 */
function HeroScreenshot() {
  const { dashboard, phoneDashboard } = SCREENSHOTS;
  const common = { alt: dashboard.alt, loading: "eager", fetchPriority: "high" } as const;
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({ ...common, src: dashboard.src, sizes: "64rem" });
  const {
    props: { srcSet: phoneSrcSet, src, alt, ...img },
  } = getImageProps({ ...common, src: phoneDashboard.src, sizes: "(min-width: 40rem) 24rem, 80vw" });

  return (
    <figure className="relative mx-auto w-full max-w-sm self-end @5xl:mx-0 @5xl:w-[64rem] @5xl:max-w-none">
      <div className="relative max-h-[28rem] overflow-hidden rounded-t-xl ring-1 ring-foreground/15 @5xl:max-h-none">
        <div className="relative">
          <picture>
            <source media="(min-width: 64rem)" srcSet={desktopSrcSet} />
            <img {...img} src={src} alt={alt} srcSet={phoneSrcSet} className="block h-auto w-full @5xl:brightness-[0.6] @5xl:saturate-[0.6]" />
          </picture>
          <div aria-hidden className="hidden @5xl:block">
            {LIT_SIGNALS.map(({ x, y, anchor, delay, variant, icon: Icon, label }) => (
              <span
                key={label}
                className={cn(
                  "absolute -translate-y-1/2 rounded-4xl bg-background",
                  anchor === "end" && "-translate-x-full",
                )}
                style={{ left: x, top: y }}
              >
                <Badge
                  variant={variant}
                  className={cn("h-6 px-2.5 text-[0.8125rem] motion-safe:animate-[signal-ignite_1.4s_ease-out_both]", delay)}
                >
                  <Icon data-icon="inline-start" />
                  {label}
                </Badge>
              </span>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="sr-only">The dashboard in the live demo (synthetic data).</figcaption>
    </figure>
  );
}
