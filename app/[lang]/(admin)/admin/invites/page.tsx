import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getInvites } from "@/lib/drasl/invites";
import { InviteManager } from "@/components/invite-manager";

export default async function InvitesPage(
  props: PageProps<"/[lang]/admin/invites">,
) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang as Locale);

  const invites = await getInvites();

  return <InviteManager invites={invites} />;
}
