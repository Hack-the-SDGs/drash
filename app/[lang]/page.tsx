import { redirect } from "next/navigation";
import { getSession } from "@/lib/drasl/auth";
import { hasLocale } from "@/lib/dictionaries";
import { notFound } from "next/navigation";

export default async function LangRootPage(props: PageProps<"/[lang]">) {
  const { lang } = await props.params;
  if (!hasLocale(lang)) notFound();

  const session = await getSession();

  if (!session) {
    redirect(`/${lang}/login`);
  }

  if (session.role === "root" || session.role === "admin") {
    redirect(`/${lang}/admin/users`);
  }

  redirect(`/${lang}/profile`);
}
