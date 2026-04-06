import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/drasl/auth";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { logoutAction } from "@/lib/actions/auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOutIcon, ShieldIcon } from "lucide-react";

export default async function UserLayout(
  props: LayoutProps<"/[lang]">,
) {
  const { lang } = await props.params;

  const session = await getSession();
  if (!session) redirect(`/${lang}/login`);

  const dict = await getDictionary(lang as Locale);

  const isAdmin = session.role === "admin" || session.role === "root";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-muted/40 backdrop-blur supports-backdrop-filter:bg-muted/20">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href={`/${lang}/profile`}
              className="text-lg font-semibold tracking-tight hover:opacity-80"
            >
              {dict.common.appName}
            </Link>

            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={`/${lang}/admin/users`} />}
              >
                <ShieldIcon className="size-4" />
                <span className="hidden sm:inline">
                  {dict.nav.adminPanel}
                </span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
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
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {props.children}
      </main>
    </div>
  );
}
