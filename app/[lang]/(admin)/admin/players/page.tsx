import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getPlayers } from "@/lib/drasl/players";
import { getUsers } from "@/lib/drasl/users";
import { getCurrentUser, getRole } from "@/lib/drasl/auth";
import { readConfig } from "@/lib/groups/store";
import { allGeneratedUsernames } from "@/lib/groups/naming";
import { PlayerTable } from "@/components/player-table";

export default async function PlayersPage(
  props: PageProps<"/[lang]/admin/players">,
) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang as Locale);

  const [allPlayers, users, currentUser, config] = await Promise.all([
    getPlayers(),
    getUsers(),
    getCurrentUser(),
    readConfig(),
  ]);

  // Hide players generated for groups/topics; they're managed on those pages.
  const generated = allGeneratedUsernames(config);
  const players = allPlayers.filter((p) => !generated.has(p.name));

  // Textures are resolved lazily per visible row (see LazyPlayerHead) so the
  // table renders instantly instead of blocking on every player's skin here.
  const userMap: Record<string, string> = {};
  const userRoleMap: Record<string, import("@/lib/types").Role> = {};
  for (const user of users) {
    userMap[user.uuid] = user.username;
    userRoleMap[user.uuid] = getRole(user);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{dict.nav.players}</h1>
          <p className="text-muted-foreground">{dict.player.description}</p>
        </div>
      </div>
      <PlayerTable players={players} userMap={userMap} userRoleMap={userRoleMap} users={users} lang={lang} viewerRole={getRole(currentUser)} viewerUsername={currentUser.username} />
    </div>
  );
}
