import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/drasl/auth";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { BatchCreateUsers } from "@/components/batch-create-users";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

export default async function BatchCreateUsersPage(
  props: PageProps<"/[lang]/admin/users/batch">,
) {
  const { lang } = await props.params;
  const session = await getSession();
  if (!session) redirect(`/${lang}/login`);

  const dict = await getDictionary(lang as Locale);

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
          {dict.users.batchCreateTitle}
        </h1>
      </div>
      <BatchCreateUsers lang={lang} isRoot={session.role === "root"} />
    </div>
  );
}
