import { Suspense } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

/**
 * Authenticated shell. The layout itself stays static (prerenderable); the
 * only session-dependent part, the user menu, streams in behind Suspense.
 * Every page verifies the user again through requireUser().
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      {/* Bypass block (WCAG 2.4.1): keyboard users skip the sidebar and its controls. */}
      <a
        href="#content"
        className="sr-only z-50 rounded-lg bg-background px-3 py-2 text-sm font-medium ring-2 ring-ring focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <AppSidebar
        footer={
          <Suspense fallback={<Skeleton className="h-12" />}>
            <CurrentUserMenu />
          </Suspense>
        }
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          {/* Base UI exposes orientation as data-vertical, not data-[orientation=vertical]. */}
          <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-center" />
          <span className="text-sm font-medium text-muted-foreground">Aegir</span>
        </header>
        <div id="content" tabIndex={-1} className="flex flex-1 flex-col gap-6 p-4 outline-none md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

async function CurrentUserMenu() {
  const user = await requireUser();
  return (
    <UserMenu
      fullName={user.fullName}
      email={user.email}
      organizationName={user.organization.name}
      roleLabel={ROLE_LABELS[user.role]}
    />
  );
}
