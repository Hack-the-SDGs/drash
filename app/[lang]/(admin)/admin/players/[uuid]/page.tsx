import { notFound } from "next/navigation";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getPlayer } from "@/lib/drasl/players";
import { getUsers } from "@/lib/drasl/users";
import { AdminPlayerEditor } from "@/components/admin-player-editor";
import { DraslAPIError } from "@/lib/drasl/client";

export default async function EditPlayerPage(
  props: PageProps<"/[lang]/admin/players/[uuid]">,
) {
  const { lang, uuid } = await props.params;
  const dict = await getDictionary(lang as Locale);

  let player;
  try {
    player = await getPlayer(uuid);
  } catch (e) {
    if (e instanceof DraslAPIError && e.status === 404) {
      notFound();
    }
    throw e;
  }

  const users = await getUsers();
  const owner = users.find((u) => u.uuid === player.userUuid);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AdminPlayerEditor
        player={player}
        ownerUsername={owner?.username}
        lang={lang}
      />
    </div>
  );
}
