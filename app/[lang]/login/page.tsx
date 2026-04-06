import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { notFound } from "next/navigation";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage(props: PageProps<"/[lang]/login">) {
  const { lang } = await props.params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dict = await getDictionary(lang);

  return <LoginForm dict={dict.auth} lang={lang} />;
}
