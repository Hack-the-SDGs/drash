import { redirect } from "next/navigation";
import { getSession } from "@/lib/drasl/auth";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { logoutAction } from "@/lib/actions/auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { LogOutIcon } from "lucide-react";

export default async function UserLayout(
  props: LayoutProps<"/[lang]">,
) {
  const { lang } = await props.params;

  const session = await getSession();
  if (!session) redirect(`/${lang}/login`);

  const dict = await getDictionary(lang as Locale);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="text-lg font-semibold tracking-tight">
            {dict.common.appName}
          </span>

          <div className="flex items-center gap-2">
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
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {props.children}
      </main>
    </div>
  );
}
