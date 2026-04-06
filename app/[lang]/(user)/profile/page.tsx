import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, scrapeUserTokens } from "@/lib/drasl/auth";
import { DraslAPIError } from "@/lib/drasl/client";
import { getRole } from "@/lib/drasl/auth";
import { resolvePlayerTextures } from "@/lib/drasl/textures";
import { checkMojangUuid } from "@/lib/mojang";
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
  UserIcon,
  ShieldCheckIcon,
  LockIcon,
  SettingsIcon,
} from "lucide-react";
import { isStaff as checkIsStaff } from "@/lib/permissions";
import { ProfilePlayers } from "@/components/profile-players";
import { ProfilePassword } from "@/components/profile-password";
import { ProfileTokens } from "@/components/profile-tokens";

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
  } catch (e) {
    if (e instanceof DraslAPIError) redirect(`/${lang}/login`);
    throw e;
  }

  // Resolve textures and Mojang status for all players
  const playersWithTextures = await Promise.all(
    user.players.map(async (player) => {
      const [textures, isMojang] = await Promise.all([
        resolvePlayerTextures(player),
        checkMojangUuid(player.uuid),
      ]);
      return { ...player, ...textures, isMojang };
    }),
  );

  const tokens = await scrapeUserTokens(user.uuid);

  const role = getRole(user);
  const staff = checkIsStaff(user);

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
            <div>
              <p className="text-xs text-muted-foreground">{dict.profile.playerLimit}</p>
              <p className="text-sm font-medium">
                {user.maxPlayerCount < 0
                  ? dict.profile.unlimited
                  : dict.profile.playerCount
                      .replace("{current}", String(user.players.length))
                      .replace("{max}", String(user.maxPlayerCount))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {staff && <ProfilePassword userUuid={user.uuid} />}

      {/* Tokens */}
      {(tokens.apiToken || tokens.minecraftToken) && (
        <ProfileTokens
          apiToken={tokens.apiToken || undefined}
          minecraftToken={tokens.minecraftToken || undefined}
        />
      )}

      {/* My Players section */}
      <ProfilePlayers
        players={playersWithTextures}
        userUuid={user.uuid}
        username={user.username}
        userRole={role}
        maxPlayerCount={user.maxPlayerCount}
        isStaff={staff}
        lang={lang}
      />
    </div>
  );
}
