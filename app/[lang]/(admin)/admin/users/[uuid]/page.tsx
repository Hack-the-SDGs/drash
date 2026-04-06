import { notFound, redirect } from "next/navigation";
import { getSession, getRole, scrapeUserTokens } from "@/lib/drasl/auth";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getUser } from "@/lib/drasl/users";
import { DraslAPIError } from "@/lib/drasl/client";
import { EditUserForm } from "@/components/edit-user-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

export default async function EditUserPage(
  props: PageProps<"/[lang]/admin/users/[uuid]">,
) {
  const { lang, uuid } = await props.params;
  const session = await getSession();

  if (!session) redirect(`/${lang}/login`);

  const dict = await getDictionary(lang as Locale);

  let user;
  try {
    user = await getUser(uuid);
  } catch (e) {
    if (e instanceof DraslAPIError) notFound();
    throw e;
  }

  const targetRole = getRole(user);
  const canManage =
    session.role === "root" ||
    (session.role === "admin" && targetRole === "user");
  if (!canManage) {
    redirect(`/${lang}/admin/users`);
  }

  // Drasl REST API doesn't return tokens in GET responses.
  // Scrape them from the Drasl web UI instead.
  const tokens = await scrapeUserTokens(uuid);
  if (tokens.apiToken) user.apiToken = tokens.apiToken;
  if (tokens.minecraftToken) user.minecraftToken = tokens.minecraftToken;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<Link href={`/${lang}/admin/users`} />}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {dict.users.editUser}: {user.username}
        </h1>
      </div>
      <EditUserForm user={user} lang={lang} viewerRole={session.role} viewerUsername={session.username} targetRole={targetRole} />
    </div>
  );
}
