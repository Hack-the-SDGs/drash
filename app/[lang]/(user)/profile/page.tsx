import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/drasl/auth";
import { getRole } from "@/lib/drasl/auth";
import { getDictionary, hasLocale, type Locale } from "@/lib/dictionaries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PencilIcon,
  UserIcon,
  ShieldCheckIcon,
  LockIcon,
  SettingsIcon,
} from "lucide-react";

function formatRelativeTime(dateStr: string, lang: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(lang === "zh-TW" ? "zh-TW" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ProfilePage(
  props: { params: Promise<{ lang: string }> },
) {
  const { lang } = await props.params;

  if (!hasLocale(lang)) {
    redirect(`/en/profile`);
  }

  const dict = await getDictionary(lang as Locale);

  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect(`/${lang}/login`);
  }

  const role = getRole(user);

  const roleBadgeVariant = role === "root"
    ? "destructive"
    : role === "admin"
      ? "default"
      : "secondary";

  const isAdmin = role === "admin" || role === "root";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{dict.profile.title}</h1>
          <p className="text-muted-foreground">{dict.profile.description}</p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${lang}/admin/users`} />}
          >
            <SettingsIcon className="size-4" data-icon="inline-start" />
            {dict.common.goToAdmin}
          </Button>
        )}
      </div>

      {/* User info card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <UserIcon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>{user.username}</CardTitle>
              <CardDescription className="font-mono text-xs">
                {user.uuid}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">
                {dict.profile.username}
              </p>
              <p className="text-sm font-medium">{user.username}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {dict.profile.uuid}
              </p>
              <p className="font-mono text-xs">{user.uuid}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {dict.profile.role}
              </p>
              <Badge variant={roleBadgeVariant}>{role}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {user.isAdmin && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    {dict.profile.isAdmin}
                  </p>
                  <Badge variant="default" className="bg-blue-600 hover:bg-blue-600">
                    <ShieldCheckIcon className="size-3" />
                    {dict.profile.isAdmin}
                  </Badge>
                </div>
              )}
              {user.isLocked && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    {dict.profile.isLocked}
                  </p>
                  <Badge variant="destructive">
                    <LockIcon className="size-3" />
                    {dict.profile.isLocked}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Players section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{dict.profile.myPlayers}</h2>
          <Badge variant="secondary">
            {dict.common.total.replace("{count}", String(user.players.length))}
          </Badge>
        </div>

        {user.players.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {dict.common.noData}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {user.players.map((player) => (
              <Card key={player.uuid}>
                <CardContent className="flex items-start gap-4 p-4">
                  {/* Skin thumbnail - bigger */}
                  <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {player.skinUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={player.skinUrl}
                        alt={player.name}
                        className="size-full object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                    ) : (
                      <UserIcon className="size-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* Player info */}
                  <div className="flex-1 space-y-1.5 overflow-hidden">
                    <p className="truncate text-sm font-medium">
                      {player.name}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {player.uuid}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs">
                        {dict.profile.skinModel}: {player.skinModel === "slim" ? dict.player.slim : dict.player.classic}
                      </Badge>
                    </div>
                    {player.createdAt && (
                      <p className="text-xs text-muted-foreground">
                        {dict.profile.createdAt}: {formatRelativeTime(player.createdAt, lang)}
                      </p>
                    )}
                  </div>

                  {/* Edit link */}
                  <Link href={`/${lang}/players/${player.uuid}`}>
                    <Button variant="ghost" size="icon-sm">
                      <PencilIcon className="size-4" />
                      <span className="sr-only">{dict.profile.editSkin}</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
