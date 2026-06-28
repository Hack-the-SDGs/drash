import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/drasl/auth";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { logoutAction } from "@/lib/actions/auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AdminMobileSidebar } from "./admin-mobile-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarNav, type NavItem } from "@/components/sidebar-nav";
import {
  LogOutIcon,
  Users,
  Gamepad2,
  Boxes,
  ClipboardList,
  TicketPlus,
  ShieldCheck,
  UserCircle,
} from "lucide-react";

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
    {
      label: dict.nav.users,
      href: `/${lang}/admin/users`,
      icon: <Users />,
    },
    {
      label: dict.nav.players,
      href: `/${lang}/admin/players`,
      icon: <Gamepad2 />,
    },
    {
      label: dict.nav.groups,
      href: `/${lang}/admin/groups`,
      icon: <Boxes />,
    },
    {
      label: dict.nav.topics,
      href: `/${lang}/admin/topics`,
      icon: <ClipboardList />,
    },
    {
      label: dict.nav.invites,
      href: `/${lang}/admin/invites`,
      icon: <TicketPlus />,
    },
  ];

  const rootNavItems: NavItem[] =
    session.role === "root"
      ? [
          {
            label: dict.nav.admins,
            href: `/${lang}/admin/admins`,
            icon: <ShieldCheck />,
          },
        ]
      : [];

  const profileNavItems: NavItem[] = [
    {
      label: dict.nav.profile,
      href: `/${lang}/profile`,
      icon: <UserCircle />,
    },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/40 md:flex">
        {/* App name / brand */}
        <div className="flex h-14 items-center border-b px-4">
          <Link
            href={`/${lang}/admin/users`}
            className="text-lg font-semibold tracking-tight hover:opacity-80"
          >
            {dict.common.appName}
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 py-4">
          <SidebarNav items={navItems} />
          {rootNavItems.length > 0 && (
            <>
              <Separator className="my-3" />
              <SidebarNav items={rootNavItems} />
            </>
          )}
          <Separator className="my-3" />
          <SidebarNav items={profileNavItems} />
        </div>

        {/* User info at bottom */}
        <div className="border-t px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
              {session.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-tight">
                {session.username}
              </span>
              <Badge variant="secondary" className="mt-0.5 w-fit text-[10px]">
                {session.role}
              </Badge>
            </div>
          </div>
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
              profileNavItems={profileNavItems}
              username={session.username}
              role={session.role}
            />

            <div className="flex-1" />

            <LanguageSwitcher locale={lang as Locale} />

            <span className="hidden text-sm text-muted-foreground sm:inline">
              {session.username}
            </span>
            <Badge variant="outline" className="hidden sm:inline-flex">
              {session.role}
            </Badge>

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
