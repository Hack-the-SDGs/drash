import { redirect } from "next/navigation";
import { getSession } from "@/lib/drasl/auth";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { logoutAction } from "@/lib/actions/auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AdminMobileSidebar } from "./admin-mobile-sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarNav, type NavItem } from "@/components/sidebar-nav";
import { LogOutIcon } from "lucide-react";

export default async function AdminLayout(
  props: LayoutProps<"/[lang]">,
) {
  const { lang } = await props.params;

  const session = await getSession();
  if (!session) redirect(`/${lang}/login`);
  if (session.role !== "admin" && session.role !== "root") {
    redirect(`/${lang}/profile`);
  }

  const dict = await getDictionary(lang as Locale);

  const navItems: NavItem[] = [
    { label: dict.nav.users, href: `/${lang}/admin/users` },
    { label: dict.nav.players, href: `/${lang}/admin/players` },
    { label: dict.nav.invites, href: `/${lang}/admin/invites` },
  ];

  const rootNavItems: NavItem[] =
    session.role === "root"
      ? [{ label: dict.nav.admins, href: `/${lang}/admin/admins` }]
      : [];

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r bg-background md:block">
        <div className="flex h-14 items-center px-4">
          <span className="text-lg font-semibold tracking-tight">
            {dict.common.appName}
          </span>
        </div>
        <div className="px-3 py-2">
          <SidebarNav items={navItems} />
          {rootNavItems.length > 0 && (
            <>
              <Separator className="my-3" />
              <SidebarNav items={rootNavItems} />
            </>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
          <div className="flex h-14 items-center gap-2 px-4">
            {/* Mobile sidebar trigger */}
            <AdminMobileSidebar
              appName={dict.common.appName}
              navItems={navItems}
              rootNavItems={rootNavItems}
            />

            <div className="flex-1" />

            <LanguageSwitcher locale={lang as Locale} />

            <span className="hidden text-sm text-muted-foreground sm:inline">
              {session.username}
            </span>

            <form action={logoutAction}>
              <Button variant="ghost" size="sm" type="submit">
                <LogOutIcon className="size-4" />
                <span className="hidden sm:inline">{dict.common.logout}</span>
              </Button>
            </form>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {props.children}
        </main>
      </div>
    </div>
  );
}
