"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
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
            className={`relative inline-flex items-center justify-start gap-3 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? "border-l-2 border-primary bg-accent/50 font-semibold text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {item.icon && (
              <span className="shrink-0 [&>svg]:size-4">{item.icon}</span>
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
