"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Sign-in requests the app never answered. On the hosted demo that is mostly the
 * firewall's per-visitor rate limit (a bare 429 at Vercel's edge, D-044), which
 * the browser can't tell apart from a dropped connection, so the copy covers both.
 * Retrying re-fetches the page with a GET, which the limit doesn't count.
 */
export default function LoginError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The form the user just submitted is gone; land keyboard and screen-reader users on what replaced it.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          <h1 ref={headingRef} tabIndex={-1} className="outline-none">
            {"Sign-in didn't go through"}
          </h1>
        </CardTitle>
        <CardDescription>
          Too many attempts from your network in a short time, or a connection problem. Wait a minute, then try
          again.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" onClick={() => retry()}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
