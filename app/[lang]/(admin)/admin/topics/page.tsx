import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getUsers } from "@/lib/drasl/users";
import { readConfig } from "@/lib/groups/store";
import { expectedUsernamesForTopic } from "@/lib/groups/naming";
import { TopicManager, type TopicStat } from "@/components/topic-manager";

export default async function TopicsPage(props: PageProps<"/[lang]/admin/topics">) {
  const { lang } = await props.params;
  const dict = await getDictionary(lang as Locale);

  const [config, users] = await Promise.all([readConfig(), getUsers()]);
  const existing = new Set(users.map((u) => u.username));

  // For each topic, how many of its expected generated accounts actually exist.
  const stats: TopicStat[] = config.topics.map((topic) => ({
    code: topic.code,
    accountCount: expectedUsernamesForTopic(topic, config.groups).filter((n) => existing.has(n))
      .length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{dict.topics.title}</h1>
        <p className="text-muted-foreground">{dict.topics.description}</p>
      </div>
      <TopicManager topics={config.topics} stats={stats} />
    </div>
  );
}
