import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { DictProvider } from "@/components/dict-provider";

export default async function LangLayout(
  props: LayoutProps<"/[lang]">,
) {
  const { lang } = await props.params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dict = await getDictionary(lang);

  return <DictProvider dict={dict}>{props.children}</DictProvider>;
}
