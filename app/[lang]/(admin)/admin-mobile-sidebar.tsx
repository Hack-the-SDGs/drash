"use client";

import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { SidebarNav, type NavItem } from "@/components/sidebar-nav";

export function AdminMobileSidebar({
  appName,
  navItems,
  rootNavItems,
  username,
  role,
}: {
  appName: string;
  navItems: NavItem[];
  rootNavItems: NavItem[];
  username: string;
  role: string;
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden" />
        }
      >
        <MenuIcon className="size-5" />
        <span className="sr-only">Toggle menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-60 flex-col p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle>{appName}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 px-3 py-4">
          <SidebarNav items={navItems} />
          {rootNavItems.length > 0 && (
            <>
              <Separator className="my-3" />
              <SidebarNav items={rootNavItems} />
            </>
          )}
        </div>
        {/* User info at bottom */}
        <div className="border-t px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-tight">
                {username}
              </span>
              <Badge variant="secondary" className="mt-0.5 w-fit text-[10px]">
                {role}
              </Badge>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
