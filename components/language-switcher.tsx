"use client";

import { usePathname } from "next/navigation";
import { GlobeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Locale } from "@/lib/dictionaries";

const localeLabels: Record<Locale, string> = {
  en: "English",
  "zh-TW": "繁體中文",
};

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  function switchLocale(target: Locale) {
    // Replace the first path segment (current locale) with the target locale
    const segments = pathname.split("/");
    segments[1] = target;
    window.location.href = segments.join("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" />}
      >
        <GlobeIcon className="size-4" />
        <span className="hidden sm:inline">{localeLabels[locale]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.entries(localeLabels) as [Locale, string][]).map(
          ([key, label]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => switchLocale(key)}
              className={key === locale ? "font-semibold" : ""}
            >
              {label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
