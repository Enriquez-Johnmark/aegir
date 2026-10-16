import * as React from "react"

// Must match Tailwind's `md:` breakpoint (48rem), which the sidebar's CSS uses to hide
// the desktop rail. Both are in rem, so a larger browser default font moves them
// together; a px query here once left wide windows with no rail and no sheet (D-048).
const MOBILE_QUERY = "(width < 48rem)"

// Subscribes to the media query with useSyncExternalStore instead of
// setState-in-effect, so there is no extra render and no tearing.
function subscribe(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches
}

// The server cannot know the viewport; render the desktop layout first.
function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
