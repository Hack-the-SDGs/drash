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
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground ${isActive ? "bg-muted font-semibold" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
