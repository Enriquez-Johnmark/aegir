"use client";

import { CircleCheckIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * One-off confirmation after a save redirect (`?saved=…`). The query parameter
 * is stripped with history.replaceState (no re-render), so a reload or a shared
 * link doesn't repeat the message; the notice stays until dismissed.
 */
export function SavedNotice({ message }: { message: string | null }) {
  const [visible, setVisible] = useState(message !== null);

  useEffect(() => {
    if (message === null) {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("saved");
    window.history.replaceState(window.history.state, "", url);
  }, [message]);

  if (!visible || message === null) {
    return null;
  }

  return (
    <Alert role="status" className="pr-12">
      <CircleCheckIcon className="text-success" />
      <AlertTitle>{message}</AlertTitle>
      <AlertDescription>The details below are what was saved.</AlertDescription>
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
