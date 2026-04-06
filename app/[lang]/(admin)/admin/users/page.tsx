import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getUsers } from "@/lib/drasl/users";
import { UserTable } from "@/components/user-table";

export default async function UsersPage(props: PageProps<"/[lang]/admin/users">) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang as Locale);
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{dict.users.title}</h1>
      <UserTable users={users} lang={lang} />
    </div>
  );
}
