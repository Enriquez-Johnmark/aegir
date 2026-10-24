import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

// The link preview for LinkedIn, Slack, email and the like (D-050): the landing hero
// in miniature, the bridge at night with the real dashboard and its signals lit.
// Generated once at build time (no request-time APIs). Satori takes no OKLCH, so the
// night tokens from globals.css are written out in sRGB; the font is ImageResponse's
// bundled Geist. On Vercel, Next makes the image URL absolute with the production
// domain (metadataBase falls back to VERCEL_PROJECT_PRODUCTION_URL).

export const alt =
  "Aegir: every failed check stays in sight until the work is done. The live demo's dashboard, with overdue, blocked and critical work lit.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NIGHT = {
  hull: "#07192c", // Night Hull, oklch(0.21 0.045 252)
  mist: "#aab9cb", // Night Mist, oklch(0.78 0.03 252)
  primary: "#9dc1ea", // Harbour Navy Night, oklch(0.8 0.07 252)
  foreground: "#fafafa",
  red: "#ff6467", // dark-theme destructive
  amber: "#f5b75b", // dark-theme warning
};

// The capture's sidebar is cut off, as in the hero (512 of 2880 px).
const SIDEBAR_FRACTION = 512 / 2880;
const FRAME_WIDTH = 860;
const IMAGE_WIDTH = FRAME_WIDTH / (1 - SIDEBAR_FRACTION);
const IMAGE_HEIGHT = (IMAGE_WIDTH * 1800) / 2880;
const contentX = (x: number) => ((x - SIDEBAR_FRACTION) / (1 - SIDEBAR_FRACTION)) * FRAME_WIDTH;

// Measured on docs/screenshots/dashboard.png, as LIT_SIGNALS in landing-hero.tsx.
const SIGNALS = [
  { left: contentX(0.3635), top: 0.313 * IMAGE_HEIGHT, color: NIGHT.red, label: "2 overdue" },
  { left: contentX(0.586), top: 0.313 * IMAGE_HEIGHT, color: NIGHT.amber, label: "1 blocked" },
  { right: FRAME_WIDTH - contentX(0.569), top: 0.636 * IMAGE_HEIGHT, color: NIGHT.red, label: "Critical" },
];

// Read at module scope, as in the Next docs, so the image is generated at build time.
const capture = await readFile(join(process.cwd(), "docs/screenshots/dashboard.png"));
const src = `data:image/png;base64,${capture.toString("base64")}`;

export default async function Image() {

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: NIGHT.hull, position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 560, padding: "56px 0 56px 64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, color: NIGHT.foreground, fontSize: 30 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 48,
                borderRadius: 12,
                background: NIGHT.primary,
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={NIGHT.hull} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 6v16" />
                <path d="m19 13 2-1a9 9 0 0 1-18 0l2 1" />
                <path d="M9 11h6" />
                <circle cx="12" cy="4" r="2" />
              </svg>
            </div>
            Aegir
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ fontSize: 54, lineHeight: 1.08, letterSpacing: "-0.03em", color: NIGHT.foreground }}>
              Every failed check stays in sight until the work is done.
            </div>
            <div style={{ fontSize: 24, lineHeight: 1.4, color: NIGHT.mist }}>
              Vessels, inspections, work orders and handovers in one audited workspace.
            </div>
          </div>
          <div style={{ fontSize: 20, color: NIGHT.primary }}>Live demo · Next.js 16 · Postgres row-level security</div>
        </div>

        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 640,
            top: 150,
            width: FRAME_WIDTH,
            height: 480,
            overflow: "hidden",
            borderTopLeftRadius: 16,
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
        >
          <img
            src={src}
            alt=""
            width={IMAGE_WIDTH}
            height={IMAGE_HEIGHT}
            style={{ position: "absolute", left: -(IMAGE_WIDTH - FRAME_WIDTH), top: 0 }}
          />
          <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: FRAME_WIDTH, height: 480, background: "rgba(7, 25, 44, 0.45)" }} />
          {SIGNALS.map(({ color, label, ...position }) => (
            <div
              key={label}
              style={{
                display: "flex",
                position: "absolute",
                ...position,
                transform: "translateY(-50%)",
                padding: "4px 14px",
                borderRadius: 999,
                fontSize: 19,
                color,
                background: NIGHT.hull,
                border: `2px solid ${color}`,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
