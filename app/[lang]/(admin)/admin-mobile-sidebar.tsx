"use client";

import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
}: {
  appName: string;
  navItems: NavItem[];
  rootNavItems: NavItem[];
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
      <SheetContent side="left" className="w-60 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle>{appName}</SheetTitle>
        </SheetHeader>
        <div className="px-3 py-2">
          <SidebarNav items={navItems} />
          {rootNavItems.length > 0 && (
            <>
              <Separator className="my-3" />
              <SidebarNav items={rootNavItems} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
