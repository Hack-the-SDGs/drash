import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getInvites } from "@/lib/drasl/invites";
import { InviteManager } from "@/components/invite-manager";

export default async function InvitesPage(
  props: PageProps<"/[lang]/admin/invites">,
) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang as Locale);

  const invites = await getInvites();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{dict.invites.title}</h1>
          <p className="text-muted-foreground">{dict.invites.description}</p>
        </div>
      </div>
      <InviteManager invites={invites} />
    </div>
  );
}
