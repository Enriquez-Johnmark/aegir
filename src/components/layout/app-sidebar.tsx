"use client";

import { AnchorIcon, ClipboardCheckIcon, LayoutDashboardIcon, ShipIcon, WrenchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

// Only routes that exist are listed; features join the nav as they ship.
const NAV_ITEMS = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Vessels", href: "/vessels", icon: ShipIcon },
  { title: "Inspections", href: "/inspections", icon: ClipboardCheckIcon },
  { title: "Work orders", href: "/work-orders", icon: WrenchIcon },
] as const;

export function AppSidebar({ footer }: { footer: React.ReactNode }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <AnchorIcon />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">Aegir</span>
                <span className="truncate text-xs text-muted-foreground">Fleet safety</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <nav aria-label="Main">
              {/* The pathname of a dynamic route is request-time data under Cache
                  Components, so only the active-state lookup waits behind Suspense. */}
              <Suspense fallback={<NavItems pathname={null} />}>
                <ActiveNavItems />
              </Suspense>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>{footer}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function ActiveNavItems() {
  return <NavItems pathname={usePathname()} />;
}

function NavItems({ pathname }: { pathname: string | null }) {
  return (
    <SidebarMenu>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || Boolean(pathname?.startsWith(`${item.href}/`));
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              render={<Link href={item.href} aria-current={active ? "page" : undefined} />}
              isActive={active}
              tooltip={item.title}
            >
              <item.icon />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
