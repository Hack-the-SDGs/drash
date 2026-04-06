import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getSession, getRole } from "@/lib/drasl/auth";
import { getUsers } from "@/lib/drasl/users";
import { UserTable } from "@/components/user-table";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/types";

export default async function UsersPage(props: PageProps<"/[lang]/admin/users">) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang as Locale);

  const session = await getSession();
  if (!session) redirect(`/${lang}/login`);

  const users = await getUsers();

  const userRoles: Record<string, Role> = {};
  for (const user of users) {
    userRoles[user.uuid] = getRole(user);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{dict.users.title}</h1>
          <p className="text-muted-foreground">{dict.users.description}</p>
        </div>
      </div>
      <UserTable users={users} lang={lang} currentUserUuid={session.uuid} viewerRole={session.role} userRoles={userRoles} />
    </div>
  );
}
