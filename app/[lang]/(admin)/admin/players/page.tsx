import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getPlayers } from "@/lib/drasl/players";
import { getUsers } from "@/lib/drasl/users";
import { PlayerTable } from "@/components/player-table";

export default async function PlayersPage(
  props: PageProps<"/[lang]/admin/players">,
) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang as Locale);

  const [players, users] = await Promise.all([getPlayers(), getUsers()]);

  const userMap: Record<string, string> = {};
  for (const user of users) {
    userMap[user.uuid] = user.username;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{dict.nav.players}</h1>
          <p className="text-muted-foreground">{dict.player.description}</p>
        </div>
      </div>
      <PlayerTable players={players} userMap={userMap} lang={lang} />
    </div>
  );
}
