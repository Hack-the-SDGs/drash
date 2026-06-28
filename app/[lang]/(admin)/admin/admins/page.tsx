import { redirect } from "next/navigation";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getSession } from "@/lib/drasl/auth";
import { getUsers } from "@/lib/drasl/users";
import { AdminManager } from "@/components/admin-manager";

export default async function AdminsPage(
  props: PageProps<"/[lang]/admin/admins">,
) {
  const { lang } = await props.params;

  const session = await getSession();
  if (!session || session.role !== "root") {
    redirect(`/${lang}/admin/users`);
  }

  const dict = await getDictionary(lang as Locale);
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{dict.admins.title}</h1>
          <p className="text-muted-foreground">{dict.admins.description}</p>
        </div>
      </div>
      <AdminManager users={users} currentUserUuid={session.uuid} lang={lang} />
    </div>
  );
}
