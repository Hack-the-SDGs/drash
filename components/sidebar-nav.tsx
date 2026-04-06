"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export interface NavItem {
  label: string;
  href: string;
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Button
            key={item.href}
            variant="ghost"
            size="sm"
            className={`justify-start ${isActive ? "bg-muted font-semibold" : ""}`}
            render={<Link href={item.href} />}
          >
            {item.label}
          </Button>
        );
      })}
    </nav>
  );
}
