"use client";

import { CircleCheckIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * One-off confirmation after a save redirect (`?saved=…`). The query parameter
 * is stripped with history.replaceState (no re-render), so a reload or a shared
 * link doesn't repeat the message; the notice stays until dismissed.
 */
export function SavedNotice({
  message,
  link,
  description = "The details below are what was saved.",
}: {
  message: string | null;
  /** A related record to open, e.g. the work order raised from this page. */
  link?: { href: string; label: string };
  description?: string;
}) {
  const [visible, setVisible] = useState(message !== null);
  // Cache Components keeps a page mounted (hidden) after client navigation, so a
  // redirect back to it reuses this instance: show each new message afresh.
  const [shownMessage, setShownMessage] = useState(message);
  if (message !== shownMessage) {
    setShownMessage(message);
    setVisible(message !== null);
  }

  useEffect(() => {
    if (message === null) {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("saved");
    url.searchParams.delete("workOrder");
    window.history.replaceState(window.history.state, "", url);
  }, [message]);

  if (!visible || message === null) {
    return null;
  }

  return (
    <Alert role="status" className="pr-12 *:[svg]:text-success">
      <CircleCheckIcon />
      <AlertTitle>{message}</AlertTitle>
      <AlertDescription>
        {description}
        {link ? (
          <>
            {" "}
            <Link href={link.href} className="font-medium text-primary underline-offset-4 hover:underline">
              {link.label}
            </Link>
          </>
        ) : null}
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-1.5 right-1.5"
        aria-label="Dismiss"
        onClick={() => setVisible(false)}
      >
        <XIcon />
      </Button>
    </Alert>
  );
}
