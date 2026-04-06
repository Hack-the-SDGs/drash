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

  return <AdminManager users={users} currentUserUuid={session.uuid} />;
}
