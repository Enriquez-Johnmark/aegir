"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type Status = "idle" | "copied" | "failed";

/**
 * Copies a short public value (the demo password) to the clipboard. The result is
 * announced, and a refused clipboard says to select the text instead: the value is
 * always visible beside the button, so nothing is lost.
 */
export function CopyButton({ value, what }: { value: string; /** Read after "Copy" by screen readers, e.g. "the demo password". */ what: string }) {
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(timer);
  }, [status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <>
      <Button type="button" variant="ghost" size="xs" onClick={copy}>
        {status === "copied" ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
        {status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Copy"}
        <span className="sr-only"> {what}</span>
      </Button>
      <span role="status" className="sr-only">
        {status === "copied" ? "Copied" : status === "failed" ? "Couldn't copy. Select the text instead." : ""}
      </span>
    </>
  );
}
