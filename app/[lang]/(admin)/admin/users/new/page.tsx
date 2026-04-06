import { redirect } from "next/navigation";
import { getSession } from "@/lib/drasl/auth";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { CreateUserForm } from "@/components/create-user-form";

export default async function NewUserPage(
  props: PageProps<"/[lang]/admin/users/new">,
) {
  const { lang } = await props.params;
  const session = await getSession();

  if (!session) redirect(`/${lang}/login`);

  const dict = await getDictionary(lang as Locale);
  const isRoot = session.role === "root";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {dict.users.createUser}
      </h1>
      <CreateUserForm lang={lang} isRoot={isRoot} />
    </div>
  );
}
