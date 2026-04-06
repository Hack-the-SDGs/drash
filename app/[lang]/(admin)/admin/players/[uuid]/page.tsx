import { notFound } from "next/navigation";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getPlayer } from "@/lib/drasl/players";
import { getUsers } from "@/lib/drasl/users";
import { AdminPlayerEditor } from "@/components/admin-player-editor";
import { DraslAPIError } from "@/lib/drasl/client";
import { resolvePlayerTextures } from "@/lib/drasl/textures";

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

  const [users, textures] = await Promise.all([
    getUsers(),
    resolvePlayerTextures(player),
  ]);
  const owner = users.find((u) => u.uuid === player.userUuid);
  const playerWithTextures = { ...player, ...textures };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPlayerEditor
        player={playerWithTextures}
        ownerUsername={owner?.username}
        lang={lang}
      />
    </div>
  );
}
