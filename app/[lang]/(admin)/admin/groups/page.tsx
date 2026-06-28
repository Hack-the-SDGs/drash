import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getUsers } from "@/lib/drasl/users";
import { readConfig } from "@/lib/groups/store";
import { expectedUsernamesForGroup } from "@/lib/groups/naming";
import { GroupManager, type GroupStat } from "@/components/group-manager";

export default async function GroupsPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang as Locale);

  const [config, users] = await Promise.all([readConfig(), getUsers()]);
  const existing = new Set(users.map((u) => u.username));

  // For each group, which of its expected generated usernames actually exist.
  const stats: GroupStat[] = config.groups.map((group) => ({
    number: group.number,
    presentUsers: expectedUsernamesForGroup(group, config.topics).filter((n) => existing.has(n)),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{dict.groups.title}</h1>
        <p className="text-muted-foreground">{dict.groups.description}</p>
      </div>
      <GroupManager groups={config.groups} stats={stats} />
    </div>
  );
}
